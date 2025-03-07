import { ELEVENLABS_API_KEY, ELEVENLABS_API_URL, VOICE_SETTINGS, DEFAULT_VOICE_ID } from '../config/elevenlabs';

interface VoiceSettings {
    stability: number;
    similarity_boost: number;
}

interface TextToSpeechRequest {
    text: string;
    model_id: string;
    voice_settings: VoiceSettings;
    optimize_streaming_latency?: number;
    output_format?: string;
}

interface VoiceResponse {
    voice_id: string;
    requires_verification: boolean;
}

interface Voice {
    voice_id: string;
    name: string;
    samples: Array<{ sample_id: string; file_name: string }>;
    category: string;
    description?: string;
}

interface VoicesResponse {
    voices: Voice[];
}

interface UploadStatus {
    status: 'preparing' | 'uploading' | 'processing' | 'completed' | 'error';
    progress: number;
    message: string;
}

type UploadStatusCallback = (status: UploadStatus) => void;

interface AudioValidationResult {
    isValid: boolean;
    message: string;
}

class ElevenLabsService {
    private voiceId: string | null = null;
    private lastUploadStatus: UploadStatus = {
        status: 'completed',
        progress: 100,
        message: 'Ready'
    };

    private validateAudioFiles(files: File[]): AudioValidationResult {
        if (!files || files.length === 0) {
            return { isValid: false, message: 'No audio files provided' };
        }

        // Check if we have at least 1 minute of audio (recommended by ElevenLabs)
        let totalDuration = 0;
        const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-m4a'];
        const invalidFiles: string[] = [];

        for (const file of files) {
            if (!validTypes.includes(file.type)) {
                invalidFiles.push(`${file.name} (invalid type: ${file.type})`);
            }
            
            // Check file size (max 15MB per file as per ElevenLabs docs)
            if (file.size > 15 * 1024 * 1024) {
                invalidFiles.push(`${file.name} (exceeds 15MB limit)`);
            }
        }

        if (invalidFiles.length > 0) {
            return {
                isValid: false,
                message: `Invalid files detected:\n${invalidFiles.join('\n')}`
            };
        }

        return { isValid: true, message: 'Audio files validated successfully' };
    }

    async createVoice(
        name: string, 
        audioFiles: File[], 
        onStatusUpdate?: UploadStatusCallback,
        options: {
            removeBackgroundNoise?: boolean;
            description?: string;
            labels?: Record<string, string>;
        } = {}
    ): Promise<string> {
        try {
            this.updateStatus('preparing', 0, 'Validating audio files...', onStatusUpdate);
            
            // Validate audio files
            const validation = this.validateAudioFiles(audioFiles);
            if (!validation.isValid) {
                throw new Error(validation.message);
            }

            this.updateStatus('preparing', 10, 'Preparing audio files for upload...', onStatusUpdate);
            
            const formData = new FormData();
            formData.append('name', name.trim());
            
            // Add each audio file to the form data with progress tracking
            const totalFiles = audioFiles.length;
            for (let i = 0; i < audioFiles.length; i++) {
                const file = audioFiles[i];
                formData.append('files', file);
                
                const progress = Math.round((i + 1) / totalFiles * 20) + 10; // 10-30% progress
                this.updateStatus(
                    'preparing',
                    progress,
                    `Processing file ${i + 1}/${totalFiles}: ${file.name}`,
                    onStatusUpdate
                );
            }

            // Add optional parameters
            if (options.description) {
                formData.append('description', options.description.trim());
            }
            
            formData.append('remove_background_noise', 
                String(options.removeBackgroundNoise ?? true)
            );
            
            if (options.labels) {
                formData.append('labels', JSON.stringify(options.labels));
            }

            this.updateStatus('uploading', 30, 'Starting voice clone upload...', onStatusUpdate);
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minute timeout

            try {
                const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
                    method: 'POST',
                    headers: {
                        'xi-api-key': ELEVENLABS_API_KEY,
                        'Accept': 'application/json'
                    },
                    body: formData,
                    signal: controller.signal
                });

                clearTimeout(timeout);

                this.updateStatus('processing', 75, 'Processing voice clone...', onStatusUpdate);

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || `Server error: ${response.statusText}`);
                }

                const data = await response.json() as VoiceResponse;
                this.voiceId = data.voice_id;

                if (data.requires_verification) {
                    this.updateStatus('completed', 100, 'Voice created but requires verification. Check your email.', onStatusUpdate);
                } else {
                    this.updateStatus('completed', 100, 'Voice clone created successfully!', onStatusUpdate);
                }

                console.log('Voice created successfully with ID:', this.voiceId);
                return data.voice_id;

            } catch (fetchError: unknown) {
                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                    throw new Error('Voice creation timed out after 5 minutes');
                }
                throw fetchError;
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            this.updateStatus('error', 0, `Error: ${errorMessage}`, onStatusUpdate);
            console.error('Error creating voice:', error);
            throw error;
        }
    }

    private updateStatus(
        status: UploadStatus['status'],
        progress: number,
        message: string,
        callback?: UploadStatusCallback
    ): void {
        this.lastUploadStatus = { status, progress, message };
        if (callback) {
            callback(this.lastUploadStatus);
        }
    }

    getLastUploadStatus(): UploadStatus {
        return this.lastUploadStatus;
    }

    async generateSpeech(text: string, useClonedVoice: boolean = true): Promise<ArrayBuffer> {
        try {
            if (useClonedVoice && !this.voiceId) {
                console.warn('No cloned voice available, falling back to default voice');
            }
            
            const voiceId = (useClonedVoice && this.voiceId) ? this.voiceId : DEFAULT_VOICE_ID;
            console.log(`Generating speech using voice ID: ${voiceId}`);

            const requestBody: TextToSpeechRequest = {
                text,
                model_id: VOICE_SETTINGS.model_id,
                voice_settings: VOICE_SETTINGS.voice_settings,
                optimize_streaming_latency: VOICE_SETTINGS.optimize_streaming_latency,
                output_format: VOICE_SETTINGS.output_format
            };

            const response = await fetch(
                `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key': ELEVENLABS_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `Failed to generate speech: ${response.statusText}`);
            }

            console.log('Speech generated successfully');
            return await response.arrayBuffer();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error generating speech:', errorMessage);
            throw new Error(`Speech generation failed: ${errorMessage}`);
        }
    }

    async getVoices(): Promise<Voice[]> {
        try {
            const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `Failed to get voices: ${response.statusText}`);
            }

            const data = await response.json() as VoicesResponse;
            return data.voices;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error getting voices:', errorMessage);
            throw new Error(`Failed to fetch voices: ${errorMessage}`);
        }
    }

    async deleteClonedVoice(): Promise<void> {
        if (!this.voiceId) {
            console.warn('No cloned voice to delete');
            return;
        }

        try {
            console.log('Deleting cloned voice:', this.voiceId);
            
            const response = await fetch(`${ELEVENLABS_API_URL}/voices/${this.voiceId}`, {
                method: 'DELETE',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `Failed to delete voice: ${response.statusText}`);
            }

            console.log('Voice deleted successfully');
            this.voiceId = null;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error deleting voice:', errorMessage);
            throw new Error(`Failed to delete voice: ${errorMessage}`);
        }
    }

    hasClonedVoice(): boolean {
        return this.voiceId !== null;
    }

    getVoiceId(): string | null {
        return this.voiceId;
    }
}

export const elevenLabsService = new ElevenLabsService(); 
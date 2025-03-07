import { elevenLabsService } from './elevenLabsService';

class AudioService {
    private audioContext: AudioContext | null = null;
    private audioSource: AudioBufferSourceNode | null = null;
    private analyser: AnalyserNode | null = null;
    private isPlaying: boolean = false;

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
    }

    async playAudio(text: string, useClonedVoice: boolean = true): Promise<void> {
        try {
            if (this.isPlaying) {
                this.stopAudio();
            }

            // Generate speech using ElevenLabs
            const audioBuffer = await elevenLabsService.generateSpeech(text, useClonedVoice);
            
            // Create audio buffer from response
            const arrayBuffer = await this.audioContext!.decodeAudioData(audioBuffer);
            
            // Create and configure source
            this.audioSource = this.audioContext!.createBufferSource();
            this.audioSource.buffer = arrayBuffer;
            
            // Connect nodes
            this.audioSource.connect(this.analyser!);
            this.analyser!.connect(this.audioContext!.destination);
            
            // Play audio
            this.isPlaying = true;
            this.audioSource.start(0);
            
            // Handle completion
            this.audioSource.onended = () => {
                this.isPlaying = false;
                this.audioSource = null;
            };
        } catch (error) {
            console.error('Error playing audio:', error);
            this.isPlaying = false;
            throw error;
        }
    }

    stopAudio(): void {
        if (this.audioSource && this.isPlaying) {
            this.audioSource.stop();
            this.isPlaying = false;
            this.audioSource = null;
        }
    }

    getAudioData(): Uint8Array {
        if (!this.analyser) return new Uint8Array();
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        return dataArray;
    }

    async playDefaultVoice(text: string): Promise<void> {
        try {
            if (this.isPlaying) {
                this.stopAudio();
            }

            const response = await fetch('/audio/Ai.mp3');
            const arrayBuffer = await response.arrayBuffer();
            
            // Create audio buffer from response
            const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
            
            // Create and configure source
            this.audioSource = this.audioContext!.createBufferSource();
            this.audioSource.buffer = audioBuffer;
            
            // Connect nodes
            this.audioSource.connect(this.analyser!);
            this.analyser!.connect(this.audioContext!.destination);
            
            // Play audio
            this.isPlaying = true;
            this.audioSource.start(0);
            
            // Handle completion
            this.audioSource.onended = () => {
                this.isPlaying = false;
                this.audioSource = null;
            };
        } catch (error) {
            console.error('Error playing default voice:', error);
            this.isPlaying = false;
            throw error;
        }
    }

    isAudioPlaying(): boolean {
        return this.isPlaying;
    }
}

export const audioService = new AudioService(); 
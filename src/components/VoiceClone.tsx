import React, { useState, useRef, useEffect } from 'react';
import { elevenLabsService } from '../services/elevenLabsService';
import type { UploadStatus } from '../services/elevenLabsService';

interface VoiceCloneProps {
    onVoiceCreated?: (voiceId: string) => void;
    onError?: (error: Error) => void;
}

const VoiceClone: React.FC<VoiceCloneProps> = ({ onVoiceCreated, onError }) => {
    const [voiceName, setVoiceName] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
        status: 'completed',
        progress: 100,
        message: 'Ready to start'
    });
    const [removeNoise, setRemoveNoise] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [recordedAudios, setRecordedAudios] = useState<File[]>([]);
    const [recordingCount, setRecordingCount] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []);
        setFiles(selectedFiles);
    };

    const startRecording = async () => {
        try {
            // Reset audio chunks
            setAudioChunks([]);
            
            // Get microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;
            
            // Create media recorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            
            // Set up event handlers
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    setAudioChunks((prev) => [...prev, event.data]);
                }
            };
            
            // Start recording
            mediaRecorder.start(200); // Collect data every 200ms
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            onError?.(error instanceof Error ? error : new Error('Failed to start recording'));
        }
    };

    const stopRecording = () => {
        if (!mediaRecorderRef.current) return;
        
        mediaRecorderRef.current.stop();
        
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }
        
        setIsRecording(false);
    };

    // Process recorded audio when recording stops
    useEffect(() => {
        if (audioChunks.length > 0 && !isRecording) {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const fileName = `recording_${recordingCount + 1}.wav`;
            const audioFile = new File([audioBlob], fileName, { type: 'audio/wav' });
            
            setRecordedAudios(prev => [...prev, audioFile]);
            setRecordingCount(prev => prev + 1);
            setAudioChunks([]);
        }
    }, [audioChunks, isRecording, recordingCount]);

    // Add recorded audios to files when user decides to use them
    const addRecordingsToFiles = () => {
        if (recordedAudios.length > 0) {
            setFiles(prev => [...prev, ...recordedAudios]);
            setRecordedAudios([]);
        }
    };

    // Discard all recorded audios
    const discardRecordings = () => {
        setRecordedAudios([]);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        
        if (!voiceName.trim()) {
            alert('Please enter a voice name');
            return;
        }

        if (files.length === 0) {
            alert('Please select at least one audio file');
            return;
        }

        try {
            const voiceId = await elevenLabsService.createVoice(
                voiceName,
                files,
                setUploadStatus,
                {
                    removeBackgroundNoise: removeNoise,
                    description: description || undefined
                }
            );

            onVoiceCreated?.(voiceId);
        } catch (error) {
            console.error('Voice creation failed:', error);
            onError?.(error instanceof Error ? error : new Error('Voice creation failed'));
        }
    };

    const getStatusColor = () => {
        switch (uploadStatus.status) {
            case 'completed': return 'bg-green-500';
            case 'error': return 'bg-red-500';
            case 'processing': return 'bg-blue-500';
            case 'uploading': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Create Voice Clone</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voice Name *
                    </label>
                    <input
                        type="text"
                        value={voiceName}
                        onChange={(e) => setVoiceName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter a name for your voice"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe your voice (optional)"
                        rows={3}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Audio Files *
                    </label>
                    <div className="flex items-center space-x-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".wav,.mp3,.m4a"
                            multiple
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Select Files
                        </button>
                        <span className="text-sm text-gray-600">
                            {files.length} file(s) selected
                        </span>
                    </div>
                    {files.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {files.map((file, index) => (
                                <li key={index} className="text-sm text-gray-600">
                                    {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Live Recording Option */}
                <div className="mt-4 p-4 border border-gray-300 rounded-md bg-gray-50">
                    <h3 className="text-lg font-medium mb-2">Record Live Audio</h3>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-4">
                            {!isRecording ? (
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    Start Recording
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={stopRecording}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    Stop Recording
                                </button>
                            )}
                            <span className="text-sm text-gray-600">
                                {isRecording ? 'Recording in progress...' : 'Click to start recording'}
                            </span>
                        </div>
                        
                        {recordedAudios.length > 0 && (
                            <div className="mt-3">
                                <h4 className="text-sm font-medium mb-1">Recorded Audio Files:</h4>
                                <ul className="space-y-1">
                                    {recordedAudios.map((file, index) => (
                                        <li key={index} className="text-sm text-gray-600">
                                            {file.name}
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex space-x-3 mt-2">
                                    <button
                                        type="button"
                                        onClick={addRecordingsToFiles}
                                        className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        Use Recordings
                                    </button>
                                    <button
                                        type="button"
                                        onClick={discardRecordings}
                                        className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                    >
                                        Discard Recordings
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        checked={removeNoise}
                        onChange={(e) => setRemoveNoise(e.target.checked)}
                        className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                        Remove background noise
                    </label>
                </div>

                {/* Upload Status */}
                <div className="mt-4">
                    <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                            <div>
                                <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-white ${getStatusColor()}`}>
                                    {uploadStatus.status}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold inline-block text-gray-600">
                                    {uploadStatus.progress}%
                                </span>
                            </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                            <div
                                style={{ width: `${uploadStatus.progress}%` }}
                                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getStatusColor()} transition-all duration-500`}
                            />
                        </div>
                        <p className="text-sm text-gray-600">{uploadStatus.message}</p>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'}
                    className={`w-full px-4 py-2 text-white rounded-md ${
                        uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                    {uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'
                        ? 'Processing...'
                        : 'Create Voice Clone'}
                </button>
            </form>
        </div>
    );
};

export default VoiceClone; 
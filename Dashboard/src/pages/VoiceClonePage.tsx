import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Upload, X, ArrowLeft, Check, AlertCircle, StopCircle } from 'lucide-react';
import { elevenLabsService } from '../services/elevenLabsService';

interface VoiceClonePageProps {
  onClose?: () => void;
}

const VoiceClonePage: React.FC<VoiceClonePageProps> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // For visualization
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'audio/mpeg' && 
        selectedFile.type !== 'audio/wav' && 
        selectedFile.type !== 'audio/x-m4a' &&
        selectedFile.type !== 'audio/m4a') {
      setError('Please upload an MP3, WAV, or M4A file');
      return;
    }

    // Check file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError('');
    setUploading(true);

    try {
      const voiceName = `voice_${new Date().toISOString()}`;
      const voiceId = await elevenLabsService.createVoice(voiceName, [selectedFile], 
        (status) => {
          if (status.status === 'error') {
            setError(status.message);
          }
        }
      );
      
      if (!voiceId) {
        throw new Error('No voice ID received from the server');
      }

      localStorage.setItem('voiceId', voiceId);
      setSuccess(true);
      
      setTimeout(() => {
        handleVoiceCloned();
      }, 1500);

    } catch (err) {
      console.error('Error cloning voice:', err);
      setError(err instanceof Error ? err.message : 'Failed to clone voice. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type !== 'audio/mpeg' && 
          droppedFile.type !== 'audio/wav' && 
          droppedFile.type !== 'audio/x-m4a' &&
          droppedFile.type !== 'audio/m4a') {
        setError('Please upload an MP3, WAV, or M4A file');
        return;
      }
      setFile(droppedFile);
      setError('');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const startRecording = async () => {
    try {
      setError('');
      setAudioChunks([]);
      setRecordingTime(0);
      
      // Get microphone permission and setup audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      // Set up audio visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
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
      
      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start visualization
      drawAudioWaveform();
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    // Stop media recorder
    mediaRecorderRef.current.stop();
    
    // Stop all audio tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Stop visualization
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsRecording(false);
  };

  const drawAudioWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!canvasCtx || !canvas || !analyser) return;
      
      animationFrameRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      canvasCtx.fillStyle = 'rgb(20, 20, 30)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        canvasCtx.fillStyle = `rgb(${Math.floor(barHeight + 100)}, 110, 230)`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
  };

  // Update the useEffect for processing recorded audio
  useEffect(() => {
    const processRecordedAudio = async () => {
      if (audioChunks.length > 0 && !isRecording) {
        try {
          setUploading(true);
          setError('');
          
          // Create audio file from chunks
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const fileName = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
          const recordedFile = new File([audioBlob], fileName, { type: 'audio/wav' });
          
          const voiceName = `recording_${new Date().toISOString()}`;
          const voiceId = await elevenLabsService.createVoice(voiceName, [recordedFile],
            (status) => {
              if (status.status === 'error') {
                setError(status.message);
              }
            }
          );
          
          if (!voiceId) {
            throw new Error('No voice ID received from the server');
          }

          localStorage.setItem('voiceId', voiceId);
          setSuccess(true);
          
          setTimeout(() => {
            handleVoiceCloned();
          }, 1500);
        } catch (err) {
          console.error('Error processing recording:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to process recording. Please try again.';
          setError(errorMessage);
        } finally {
          setUploading(false);
        }
      }
    };

    processRecordedAudio();
  }, [audioChunks, isRecording]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // After successful voice cloning
  const handleVoiceCloned = () => {
    const returnTo = localStorage.getItem('returnTo');
    if (returnTo) {
      navigate(returnTo);
    } else {
      navigate('/');
    }
  };

  const removeFile = () => {
    setFile(null);
    setError('');
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Voice Cloning</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-white mb-2">Choose Your Method</h3>
            <p className="text-gray-400">Select how you want to provide your voice sample</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recording Option */}
            <div className="bg-gray-700/50 rounded-lg p-6 hover:bg-gray-700/70 transition-colors">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mic className="w-6 h-6 text-blue-400" />
                </div>
                <h4 className="text-white font-medium">Record Now</h4>
                <p className="text-sm text-gray-400 mt-1">Record your voice directly</p>
              </div>

              {isRecording ? (
                <div className="space-y-4">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-24 rounded-lg bg-gray-800"
                    width={300}
                    height={96}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-white">{formatTime(recordingTime)}</span>
                    <button
                      onClick={stopRecording}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center space-x-2"
                    >
                      <StopCircle className="w-5 h-5" />
                      <span>Stop Recording</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center space-x-2"
                  disabled={uploading}
                >
                  <Mic className="w-5 h-5" />
                  <span>Start Recording</span>
                </button>
              )}
            </div>

            {/* Upload Option */}
            <div className="bg-gray-700/50 rounded-lg p-6 hover:bg-gray-700/70 transition-colors">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-purple-400" />
                </div>
                <h4 className="text-white font-medium">Upload Audio</h4>
                <p className="text-sm text-gray-400 mt-1">Upload an existing recording</p>
              </div>

              <div
                className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {file ? (
                  <div className="space-y-2">
                    <p className="text-white">{file.name}</p>
                    <button
                      onClick={removeFile}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-400 mb-2">Drag & drop your audio file here</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg inline-flex items-center space-x-2"
                    >
                      <Upload className="w-5 h-5" />
                      <span>Choose File</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="audio/mpeg,audio/wav,audio/x-m4a,audio/m4a"
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Messages */}
          <div className="mt-6">
            {error && (
              <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 text-green-400 p-4 rounded-lg flex items-center space-x-2">
                <Check className="w-5 h-5" />
                <span>Voice cloned successfully!</span>
              </div>
            )}
            {uploading && (
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <p className="mt-2">Processing your voice...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceClonePage; 
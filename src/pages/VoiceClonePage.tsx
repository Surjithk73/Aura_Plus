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

    setFile(selectedFile);
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:8080/api/voice/clone', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to clone voice');
      }

      const data = await response.json();
      // Store the voice ID in localStorage
      localStorage.setItem('voiceId', data.voice_id);
      setSuccess(true);
      
      // Automatically return after successful cloning
      setTimeout(() => {
        handleVoiceCloned();
      }, 1500); // Give user time to see success message

    } catch (err) {
      console.error('Error cloning voice:', err);
      setError('Failed to clone voice. Please try again.');
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

  // Process recorded audio when recording stops
  useEffect(() => {
    if (audioChunks.length > 0 && !isRecording) {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const fileName = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
      const recordedFile = new File([audioBlob], fileName, { type: 'audio/wav' });
      
      setFile(recordedFile);
    }
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Back</span>
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <h1 className="text-2xl font-bold mb-6">Voice Cloning</h1>
          
          <div className="space-y-4">
            <label className="block">
              <span className="text-gray-300">Upload Voice Sample</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </label>

            {uploading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <p className="mt-2 text-sm text-gray-400">Cloning voice...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400">
                Voice cloned successfully! Redirecting...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceClonePage; 
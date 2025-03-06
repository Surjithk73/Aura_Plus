import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Upload, X, ArrowLeft, Check, AlertCircle, StopCircle } from 'lucide-react';
import { elevenLabsService } from '../services/elevenLabsService';

const VoiceClonePage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'audio/mpeg' && 
          selectedFile.type !== 'audio/wav' && 
          selectedFile.type !== 'audio/x-m4a' &&
          selectedFile.type !== 'audio/m4a') {
        setError('Please upload an MP3, WAV, or M4A file');
        return;
      }
      setFile(selectedFile);
      setError(null);
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
      setError(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const startRecording = async () => {
    try {
      setError(null);
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

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      await elevenLabsService.createVoice('Therapy Assistant', [file]);
      setSuccess(true);
      setUploadProgress(100);
      
      // Redirect to home after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      setError('Failed to clone voice. Please try again.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Back to Chat</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            Create Your Personal AI Voice
          </h1>
          <p className="text-gray-400 text-lg">
            Transform your therapy experience with a voice that feels natural and personal
          </p>
        </div>

        {/* Voice Recording Instructions */}
        <div className="bg-gray-800/50 rounded-xl p-8 mb-8 backdrop-blur-sm">
          <h2 className="text-2xl font-semibold mb-6">Recording Guidelines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm">1</span>
                </div>
                <p className="text-gray-300">Find a quiet room with minimal background noise</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm">2</span>
                </div>
                <p className="text-gray-300">Speak naturally and clearly for 30-60 seconds</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm">3</span>
                </div>
                <p className="text-gray-300">Use MP3, WAV, or M4A format for best quality</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm">4</span>
                </div>
                <p className="text-gray-300">Maintain consistent volume and pace</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recording Section */}
        {isRecording && (
          <div className="bg-gray-800/70 rounded-xl p-6 mb-8 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-4">
              <h3 className="text-xl font-semibold text-red-400">Recording in Progress</h3>
              
              <div className="w-full h-24 mb-2">
                <canvas 
                  ref={canvasRef} 
                  className="w-full h-full rounded-lg bg-gray-900"
                  width="600"
                  height="100"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="animate-pulse w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xl font-mono">{formatTime(recordingTime)}</span>
                
                <button
                  onClick={stopRecording}
                  className="ml-4 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <StopCircle className="w-5 h-5 text-red-400" />
                  <span>Stop Recording</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div 
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
            file ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-blue-500 hover:bg-blue-500/5'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {!file ? (
            <>
              <input
                type="file"
                accept=".mp3,.wav,.m4a"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold">Choose your voice sample</h3>
                <p className="text-gray-400 mb-4">Upload an audio file or record directly</p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Upload File</span>
                  </button>
                  
                  {!isRecording && (
                    <button
                      onClick={startRecording}
                      className="w-full sm:w-auto px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center justify-center space-x-2"
                      disabled={isRecording}
                    >
                      <Mic className="w-5 h-5" />
                      <span>Record Now</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center space-x-4">
                <Mic className="w-8 h-8 text-green-400" />
                <span className="text-lg font-medium">{file.name}</span>
                <button
                  onClick={removeFile}
                  className="p-2 hover:bg-red-500/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-red-400" />
                </button>
              </div>
              
              {!isUploading && !success && (
                <button
                  onClick={handleUpload}
                  className="px-8 py-3 bg-green-500 hover:bg-green-600 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>Start Voice Cloning</span>
                </button>
              )}

              {isUploading && (
                <div className="space-y-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-blue-400">Creating your AI voice...</p>
                </div>
              )}

              {success && (
                <div className="flex items-center justify-center space-x-2 text-green-400">
                  <Check className="w-5 h-5" />
                  <span>Voice cloned successfully! Redirecting...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceClonePage; 
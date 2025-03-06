import React, { useState } from 'react';
import { Mic, MicOff, History, Upload, X, Plus } from 'lucide-react';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { useAI } from './hooks/useAI';
import AudioUpload from './components/AudioUpload';
import { ModelViewer } from '../ModelViewer';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [response, setResponse] = useState('');
  const [displayedResponse, setDisplayedResponse] = useState(''); // For typing animation
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const { transcript, startListening, stopListening } = useVoiceRecognition();
  const { generateResponse, speakText } = useAI();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null); // WebSocket state
  const [aiSpeaking, setAiSpeaking] = useState(false); // Track if AI is speaking
  const [status, setStatus] = useState(''); // Track current status
  const [showAudioUpload, setShowAudioUpload] = useState(false); // For showing/hiding audio upload modal

  const handleMicClick = async () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      setProcessing(true);
      setStatus('Thinking...'); // Set status to thinking
      
      try {
        const aiResponse = await generateResponse(transcript, audioFile);
        if (aiResponse) {
          setResponse(aiResponse); // Use the response directly
          aiIsSpeaking(aiResponse); // Call to simulate AI speaking with typing animation
        }
      } catch (error) {
        console.error('Error generating response:', error);
        setResponse('I apologize, but I encountered an error processing your message.');
      }
      
      setProcessing(false);
      setStatus(''); // Reset status
    } else {
      setResponse(''); // Clear previous response
      startListening();
      setIsListening(true);
      setStatus('Listening...'); // Set status to listening
    }
  };

  const clearAudio = () => {
    setAudioFile(null);
  };

  const beginSession = () => {
    const websocket = new WebSocket('ws://localhost:8080'); // Connect to the WebSocket server
    setWs(websocket); // Store the WebSocket connection
    setSessionStarted(true);
    setResponse(''); // Clear previous responses
    setDisplayedResponse(''); // Clear any previous responses

    websocket.onopen = () => {
      console.log('WebSocket connection established');
      // Send a greeting message from the AI
      const greeting = "Hello! I'm your AI assistant. Please start speaking when you're ready.";
      setResponse(greeting);
      
      // First start the typing animation, then speak the text
      aiIsSpeaking(greeting);
      
      // Optional: You can also make it speak the greeting aloud after typing
      // speakText(greeting);
    };

    websocket.onclose = () => {
      console.log('WebSocket connection closed');
      setSessionStarted(false); // Reset session state when closed
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const endSession = () => {
    if (ws) {
      ws.close(); // Close the WebSocket connection
    }
  };

  // Function to simulate AI speaking with typing animation
  const aiIsSpeaking = (text: string) => {
    setAiSpeaking(true);
    setDisplayedResponse(''); // Clear displayed response
    setStatus('Speaking...'); // Add speaking status

    let index = 0; // Start from first character
    const typingInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayedResponse((prev) => prev + text[index]);
        index++;
      } else {
        clearInterval(typingInterval);
        setAiSpeaking(false);
        setStatus(''); // Clear status when done speaking
      }
    }, 40); // Slightly faster typing speed for better UX
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col shadow-lg">
        {/* Logo */}
        <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold">Aura+</span>
        </div>
        
        {/* Sidebar navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          <button 
            onClick={() => setShowAudioUpload(!showAudioUpload)} 
            className="flex items-center px-4 py-3 text-gray-300 rounded hover:bg-gray-700 hover:text-white w-full transition-colors"
          >
            <Upload className="w-5 h-5 mr-3" />
            <span>Add Voices</span>
          </button>
          
          <button className="flex items-center px-4 py-3 text-gray-300 rounded hover:bg-gray-700 hover:text-white w-full transition-colors">
            <History className="w-5 h-5 mr-3" />
            <span>Session History</span>
          </button>
        </nav>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Audio upload modal */}
        {showAudioUpload && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-96">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-lg font-semibold">Upload Voice Sample</h3>
                <button 
                  onClick={() => setShowAudioUpload(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <AudioUpload setAudioFile={setAudioFile} />
              <div className="mt-4 flex justify-between">
                <button 
                  onClick={clearAudio} 
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Clear Audio
                </button>
                <button 
                  onClick={() => setShowAudioUpload(false)} 
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Central content area */}
        <div className="max-w-3xl w-full space-y-6">
          {/* Status indicator */}
          {status && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-gray-800 px-6 py-2 rounded-full shadow-lg border border-gray-700/50">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'Listening...' ? 'bg-green-500 animate-pulse' : 
                    status === 'Thinking...' ? 'bg-yellow-500 animate-pulse' : 
                    'bg-blue-500 animate-pulse'
                  }`}></div>
                  <span className="text-white font-medium">{status}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* AI Visualization */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative w-40 h-40 rounded-full overflow-hidden shadow-lg shadow-blue-500/30">
              <ModelViewer 
                isListening={isListening} 
                isProcessing={processing} 
                hasResponse={aiSpeaking}
              />
            </div>
            
            {/* Begin Session Button - only shown initially */}
            {!sessionStarted && (
              <button
                onClick={beginSession}
                className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Begin Session
              </button>
            )}
          </div>

          {/* AI Response Area */}
          {sessionStarted && (
            <div className="relative w-full mb-20">
              <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-8 min-h-[200px] shadow-lg border border-gray-700/50">
                <p className="text-white text-lg leading-relaxed">
                  {displayedResponse || ''}
                </p>
              </div>
              
              {/* Control buttons at bottom of response area */}
              <div className="absolute -bottom-6 left-0 right-0 flex justify-center space-x-4">
                <button
                  onClick={handleMicClick}
                  className={`p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${
                    aiSpeaking || processing
                      ? 'bg-gray-600 cursor-not-allowed'
                      : isListening
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  disabled={aiSpeaking || processing}
                >
                  {isListening ? (
                    <MicOff className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </button>
                
                {/* End Session Button */}
                <button
                  onClick={endSession}
                  className="p-4 rounded-full bg-red-500 hover:bg-red-600 shadow-lg transition-all duration-300 transform hover:scale-110"
                  title="End Session"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
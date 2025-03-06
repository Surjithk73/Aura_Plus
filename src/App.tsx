import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
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

    websocket.onopen = () => {
      console.log('WebSocket connection established');
      // Send a greeting message from the AI
      const greeting = "Hello! I'm your AI assistant. Please start speaking when you're ready.";
      setResponse(greeting);
      speakText(greeting).then(() => {
        aiIsSpeaking(greeting); // Start typing animation after greeting is spoken
      });
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

    let index = -1; // Start from first character
    const typingInterval = setInterval(() => {
      if (index < text.length-1) {
        setDisplayedResponse((prev) => prev + text[index]);
        index++;
      } else {
        clearInterval(typingInterval);
        setAiSpeaking(false);
      }
    }, 40); // Slightly faster typing speed for better UX
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <AudioUpload setAudioFile={setAudioFile} />
      <div className="max-w-2xl w-full space-y-8">
        {/* AI Circle with Status Display */}
        <div className="flex flex-col items-center">
          <div className="text-white mb-2">{status || 'Ready'}</div>
          <div className="relative w-32 h-32 rounded-full overflow-hidden">
            <ModelViewer 
              isListening={isListening} 
              isProcessing={processing} 
              hasResponse={aiSpeaking}
            />
          </div>
        </div>

        {/* AI Response Display with Typing Animation */}
        <div className="bg-gray-700 rounded-lg p-6 min-h-[100px] text-white">
          {displayedResponse || 'Click the microphone to start speaking...'}
        </div>

        {/* Begin Session Button */}
        {!sessionStarted && (
          <div className="flex justify-center">
            <button
              onClick={beginSession}
              className="p-4 rounded-full bg-green-500 text-white hover:bg-green-600 transition-all duration-300"
            >
              Begin Session
            </button>
          </div>
        )}

        {/* End Session Button */}
        {sessionStarted && (
          <div className="flex justify-center">
            <button
              onClick={endSession}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all duration-300"
            >
              End Session
            </button>
          </div>
        )}

        {/* Microphone Button */}
        {sessionStarted && (
          <div className="flex justify-center">
            <button
              onClick={handleMicClick}
              className={`p-4 rounded-full transition-all duration-300 ${
                aiSpeaking || processing // Disable button if AI is speaking or processing
                  ? 'bg-gray-500 cursor-not-allowed' // Change color and disable
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
              disabled={aiSpeaking || processing} // Disable button if AI is speaking or processing
            >
              {isListening ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
          </div>
        )}

        <button onClick={clearAudio} className="mt-4 p-2 bg-red-500 text-white rounded">
          Clear Uploaded Audio
        </button>
      </div>
    </div>
  );
}

export default App;
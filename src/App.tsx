import React, { useState, useEffect } from 'react';
import { Mic, MicOff, History, Upload, X, Plus } from 'lucide-react';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { useAI } from './hooks/useAI';
import AudioUpload from './components/AudioUpload';
import { ModelViewer } from '../ModelViewer';

interface Conversation {
  timestamp: string;
  userMessage: string;
  aiResponse: string;
}

interface ConversationSession {
  $id: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  conversation: Conversation[];
  messageCount: number;
}

// Add fetch function for sessions
const fetchSessions = async () => {
  try {
    const response = await fetch('http://localhost:8080/api/sessions/all');
    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
};

// Add fetch function for individual session
const fetchSessionById = async (sessionId: string) => {
  try {
    const response = await fetch(`http://localhost:8080/api/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch session');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
};

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
  const [typingInterval, setTypingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [audioElements, setAudioElements] = useState<HTMLAudioElement[]>([]);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [currentSession, setCurrentSession] = useState<Conversation[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [selectedSessionData, setSelectedSessionData] = useState<ConversationSession | null>(null);

  // Add useEffect to fetch sessions when history is opened
  useEffect(() => {
    if (showHistory) {
      fetchSessions().then(data => {
        setSessions(data);
      });
    }
  }, [showHistory]);

  // Add useEffect to fetch session details when a session is selected
  useEffect(() => {
    if (selectedSession) {
      fetchSessionById(selectedSession).then(data => {
        if (data) {
          setSelectedSessionData(data);
          setShowSessionDetail(true);
        }
      });
    }
  }, [selectedSession]);

  const handleMicClick = async () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      setProcessing(true);
      setStatus('Thinking...');
      
      try {
        const aiResponse = await generateResponse(transcript, audioFile);
        if (aiResponse) {
          setResponse(aiResponse);
          
          // Add to current session
          const newConversation = {
            userMessage: transcript,
            aiResponse: aiResponse,
            timestamp: new Date().toISOString()
          };
          setCurrentSession(prev => [...prev, newConversation]);
          
          // Save conversation using REST API
          try {
            await fetch('http://localhost:8080/api/sessions/current', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(newConversation),
            });
          } catch (error) {
            console.error('Error saving conversation:', error);
          }
          
          const audio = new Audio();
          setAudioElements(prev => [...prev, audio]);
          aiIsSpeaking(aiResponse);
          audio.onended = () => {
            setAudioElements(prev => prev.filter(a => a !== audio));
          };
        }
      } catch (error) {
        console.error('Error generating response:', error);
        setResponse('I apologize, but I encountered an error processing your message.');
      }
      
      setProcessing(false);
      setStatus('');
    } else {
      setResponse('');
      startListening();
      setIsListening(true);
      setStatus('Listening...');
    }
  };

  const clearAudio = () => {
    setAudioFile(null);
  };

  const endSession = async () => {
    try {
      // End the current session using REST API
      await fetch('http://localhost:8080/api/sessions/current/end', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error ending session:', error);
    }
    
    // Stop any ongoing typing animation
    if (typingInterval) {
      clearInterval(typingInterval);
      setTypingInterval(null);
    }
    // Stop all playing audio elements
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setAudioElements([]);
    setAiSpeaking(false);
    setDisplayedResponse('');
    setStatus('');
    setCurrentSession([]);
    setSessionStarted(false);
  };

  // Function to simulate AI speaking with typing animation
  const aiIsSpeaking = (text: string) => {
    setAiSpeaking(true);
    setDisplayedResponse(''); // Clear displayed response
    setStatus('Speaking...'); // Add speaking status

    // Clear any existing typing interval
    if (typingInterval) {
      clearInterval(typingInterval);
    }

    let index = 0; // Start from first character
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedResponse((prev) => prev + text[index]);
        index++;
      } else {
        clearInterval(interval);
        setTypingInterval(null);
        setAiSpeaking(false);
        setStatus(''); // Clear status when done speaking
      }
    }, 40); // Slightly faster typing speed for better UX
    setTypingInterval(interval);
  };

  // Replace setupWebSocket with direct database interaction
  const beginSession = async () => {
    try {
      // Start a new session using REST API
      const response = await fetch('http://localhost:8080/api/sessions/start', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to start session');
      }
      
      setSessionStarted(true);
      setResponse('');
      setDisplayedResponse('');
      
      const greeting = "Hello! I'm your AI assistant. Please start speaking when you're ready.";
      setResponse(greeting);
      
      const audio = new Audio();
      setAudioElements(prev => [...prev, audio]);
      speakText(greeting).then(() => {
        aiIsSpeaking(greeting);
        audio.onended = () => {
          setAudioElements(prev => prev.filter(a => a !== audio));
        };
      });
    } catch (error) {
      console.error('Error starting session:', error);
    }
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
          
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center px-4 py-3 text-gray-300 rounded hover:bg-gray-700 hover:text-white w-full transition-colors"
          >
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

        {/* History Page */}
        {showHistory && (
          <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-gray-800 z-50 overflow-y-auto">
            <div className="min-h-screen w-full">
              {/* Header */}
              <div className="bg-gray-800 shadow-lg sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <button 
                        onClick={() => {
                          setShowHistory(false);
                          setShowSessionDetail(false);
                        }}
                        className="text-gray-400 hover:text-white mr-4"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <div>
                        <h1 className="text-2xl font-bold text-white">Therapy Sessions</h1>
                        <p className="text-gray-400 text-sm">
                          {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} recorded
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              {!showSessionDetail ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sessions
                      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                      .map((session, index) => (
                        <div 
                          key={session.$id}
                          onClick={() => {
                            setSelectedSessionData(session);
                            setShowSessionDetail(true);
                          }}
                          className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
                        >
                          <div className="flex flex-col h-full">
                            <div className="mb-4 pb-4 border-b border-gray-700">
                              <span className="text-blue-400 font-semibold text-xl block mb-2">
                                Session {sessions.length - index}
                              </span>
                              <div className="text-gray-400 text-sm space-y-1">
                                <div>{new Date(session.startTime).toLocaleDateString()}</div>
                                <div>{new Date(session.startTime).toLocaleTimeString()}</div>
                              </div>
                            </div>
                            <div className="flex-grow">
                              <div className="flex flex-col space-y-3">
                                <div className="flex items-center text-sm text-gray-400">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                  </svg>
                                  {session.messageCount} {session.messageCount === 1 ? 'message' : 'messages'}
                                </div>
                                <div className="flex items-center text-sm text-gray-400">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                  </svg>
                                  {Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)} mins
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="bg-gray-800 rounded-xl shadow-xl p-6">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-white mb-2">Session Details</h2>
                      <div className="text-gray-400 text-sm">
                        {new Date(selectedSessionData?.startTime || '').toLocaleDateString()} • 
                        {new Date(selectedSessionData?.startTime || '').toLocaleTimeString()} - 
                        {new Date(selectedSessionData?.endTime || '').toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {selectedSessionData?.conversation.map((conv, idx) => (
                        <div key={idx} className="flex flex-col space-y-4">
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-medium">You</span>
                            </div>
                            <div className="flex-grow">
                              <div className="bg-gray-700 p-4 rounded-lg shadow-md">
                                <p className="text-white">{conv.userMessage}</p>
                                <span className="text-xs text-gray-400 block mt-2">
                                  {new Date(conv.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-medium">AI</span>
                            </div>
                            <div className="flex-grow">
                              <div className="bg-gray-700 p-4 rounded-lg shadow-md">
                                <p className="text-white">{conv.aiResponse}</p>
                                <span className="text-xs text-gray-400 block mt-2">
                                  {new Date(conv.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
              <p className="text-white text-lg leading-relaxed text-center mx-auto max-w-2xl">
                {displayedResponse || ''}
              </p>
              
              {/* Control buttons in curved layout */}
              <div className="absolute -bottom-32 left-0 right-0 flex justify-center items-center">
                <div className="flex items-center space-x-12 px-12 py-4 rounded-full bg-gray-800/30 backdrop-blur-sm">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
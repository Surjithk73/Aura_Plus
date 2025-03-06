import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Mic, MicOff, History, X, Plus, BarChart, Mic as MicIcon, ChevronLeft, ChevronRight, Box, Phone } from 'lucide-react';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { useAI } from './hooks/useAI';
import { ModelViewer } from '../ModelViewer';
import Analysis from './components/Analysis/Analysis';
import VoiceClonePage from './pages/VoiceClonePage';
import ThreeDModelPage from './pages/ThreeDModelPage';
import { elevenLabsService } from './services/elevenLabsService';
import { DEFAULT_VOICE_ID } from './config/elevenlabs';
import SessionHistory from './components/SessionHistory/SessionHistory';
import EmergencyContacts from './components/EmergencyContacts';
import { sessionService } from './services/sessionService';

// Types
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

// API Functions
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

function AppContent() {
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [response, setResponse] = useState('');
  const [displayedResponse, setDisplayedResponse] = useState('');
  const { transcript, startListening, stopListening } = useVoiceRecognition();
  const { generateResponse, voiceCloned, resetVoice } = useAI();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [status, setStatus] = useState('');
  const [typingInterval, setTypingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [audioElements, setAudioElements] = useState<HTMLAudioElement[]>([]);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [currentSession, setCurrentSession] = useState<Conversation[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [selectedSessionData, setSelectedSessionData] = useState<ConversationSession | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [show3DModel, setShow3DModel] = useState(false);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [showVoiceClone, setShowVoiceClone] = useState(false);

  const navigate = useNavigate();

  // Initialize state from sessionService
  useEffect(() => {
    const initializeState = async () => {
      // Load sessions
      const allSessions = await sessionService.getAllSessions();
      setSessions(allSessions);

      // Check if there's an active session
      if (sessionService.isSessionStarted()) {
        setSessionStarted(true);
        const currentSession = sessionService.getCurrentSession();
        setCurrentSession(currentSession);
      }
    };

    initializeState();
  }, []);

  // Update session details when selected
  useEffect(() => {
    const loadSessionDetails = async () => {
      if (selectedSession) {
        const data = await sessionService.getSessionById(selectedSession);
        if (data) {
          setSelectedSessionData(data);
          setShowSessionDetail(true);
        }
      }
    };

    loadSessionDetails();
  }, [selectedSession]);

  useEffect(() => {
    const loadSessions = async () => {
      const allSessions = await sessionService.getAllSessions();
      if (allSessions) {
        setSessions(allSessions);
      }
    };

    loadSessions();
  }, []);

  const handleMicClick = async () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      setProcessing(true);
      setStatus('Thinking...');
      
      try {
        const aiResponse = await generateResponse(transcript, null);
        if (aiResponse) {
          setResponse(aiResponse);
          
          const newConversation = {
            userMessage: transcript,
            aiResponse: aiResponse,
            timestamp: new Date().toISOString()
          };
          
          // Update current session
          const updatedSession = [...currentSession, newConversation];
          setCurrentSession(updatedSession);
          
          // Save conversation using sessionService
          await sessionService.saveConversation(newConversation);
          
          // Update sessions list
          const updatedSessions = await sessionService.getAllSessions();
          setSessions(updatedSessions);

          try {
            const voiceId = elevenLabsService.getVoiceId() ?? DEFAULT_VOICE_ID;
            const audioBuffer = await elevenLabsService.generateSpeech(aiResponse, true);
            const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
            const audio = new Audio(URL.createObjectURL(blob));
            setAudioElements(prev => [...prev, audio]);
            
            audio.onended = () => {
              setAudioElements(prev => prev.filter(a => a !== audio));
              URL.revokeObjectURL(audio.src);
            };
            
            await audio.play();
            aiIsSpeaking(aiResponse);
          } catch (error) {
            console.error('Error playing audio:', error);
            aiIsSpeaking(aiResponse);
          }
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

  const endSession = async () => {
    try {
      await sessionService.endSession();
      
      // Update local state
      setSessionStarted(false);
      setCurrentSession([]);
      
      // Update sessions list
      const updatedSessions = await sessionService.getAllSessions();
      setSessions(updatedSessions);
      
      // Clean up UI state
      if (typingInterval) {
        clearInterval(typingInterval);
        setTypingInterval(null);
      }
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      setAudioElements([]);
      setAiSpeaking(false);
      setDisplayedResponse('');
      setStatus('');
    } catch (error) {
      console.error('Error ending session:', error);
    }
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

    let index = -1; // Start from first character
    const interval = setInterval(() => {
      if (index < text.length-1) {
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

  const beginSession = async () => {
    try {
      const success = await sessionService.startSession();
      
      if (success) {
        setSessionStarted(true);
        setResponse('');
        setDisplayedResponse('');
        
        const greeting = "Hello! How are you doing today?";
        setResponse(greeting);

        try {
          const voiceId = elevenLabsService.getVoiceId() ?? DEFAULT_VOICE_ID;
          const audioBuffer = await elevenLabsService.generateSpeech(greeting, true);
          const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
          const audio = new Audio(URL.createObjectURL(blob));
          setAudioElements(prev => [...prev, audio]);
          
          audio.onended = () => {
            setAudioElements(prev => prev.filter(a => a !== audio));
            URL.revokeObjectURL(audio.src);
          };
          
          await audio.play();
          aiIsSpeaking(greeting);
        } catch (error) {
          console.error('Error playing audio:', error);
          aiIsSpeaking(greeting);
        }
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const goToThreeDModel = () => {
    navigate('/3d-model');
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Sidebar */}
      <div className="w-72 bg-gray-800/95 backdrop-blur-lg text-white flex flex-col shadow-xl border-r border-gray-700/50">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">Aura +</span>
              <p className="text-xs text-gray-400">Your Personal Therapy Companion</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <button
              onClick={() => setShowVoiceClone(true)}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white rounded-lg transition-all duration-200 hover:bg-blue-500/10 group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 flex items-center justify-center transition-colors">
                <MicIcon className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
              </div>
              <span className="font-medium">Voice Clone</span>
            </button>
            
            <button 
              onClick={() => navigate('/session-history')}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white rounded-lg transition-all duration-200 hover:bg-purple-500/10 group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 flex items-center justify-center transition-colors">
                <History className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
              </div>
              <span className="font-medium">Session History</span>
            </button>
            
            <button
              onClick={() => navigate('/analysis')}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white rounded-lg transition-all duration-200 hover:bg-green-500/10 group"
            >
              <div className="w-8 h-8 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 flex items-center justify-center transition-colors">
                <BarChart className="w-5 h-5 text-green-400 group-hover:text-green-300" />
              </div>
              <span className="font-medium">View Analysis</span>
            </button>

            {/* Emergency Contacts Button */}
            <button
              onClick={() => setShowEmergencyContacts(true)}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white rounded-lg transition-all duration-200 hover:bg-red-500/10 group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 flex items-center justify-center transition-colors">
                <Phone className="w-5 h-5 text-red-400 group-hover:text-red-300" />
              </div>
              <span className="font-medium">Emergency Contacts</span>
            </button>
          </div>
        </nav>

        {/* Footer
        <div className="p-4 border-t border-gray-700/50">
          <div className="px-3 py-2 rounded-lg bg-gray-700/30">
            <p className="text-xs text-gray-400 text-center">
              AI Assistant v1.0
            </p>
          </div>
        </div> */}
      </div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className="fixed left-72 top-6 z-50 p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-r-lg shadow-lg transition-all duration-300 ease-in-out"
        style={{
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-288px)'
        }}
      >
        {isSidebarOpen ? (
          <ChevronLeft className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>

      {/* 3D Model Toggle Button */}
      <button
        onClick={() => setShow3DModel(!show3DModel)}
        className="fixed top-6 right-6 z-50 flex items-center space-x-2 px-4 py-2 bg-gray-800/90 hover:bg-gray-700/90 text-white rounded-lg shadow-lg transition-all duration-200 hover:scale-105 group"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 group-hover:from-blue-500/30 group-hover:to-purple-500/30 flex items-center justify-center transition-colors">
          <Box className="w-5 h-5 text-blue-400 group-hover:text-purple-400" />
        </div>
        <span className="font-medium bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">3D Model</span>
      </button>

      {/* Main content */}
      <div className={`flex-1 flex flex-col items-center justify-center p-6 relative transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-72' : 'ml-0'}`}>
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
              className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 shadow-blue-500/30"
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

      {/* Emergency Contacts Modal */}
      {showEmergencyContacts && (
        <EmergencyContacts onClose={() => setShowEmergencyContacts(false)} />
      )}

      {/* Voice Clone Modal */}
      {showVoiceClone && (
        <VoiceClonePage onClose={() => setShowVoiceClone(false)} />
      )}

      {/* Add 3D Model button next to Voice Clone button */}
      <div className="fixed top-6 right-6 flex space-x-4">
        <button
          onClick={() => setShowVoiceClone(true)}
          className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
        >
          <Mic className="w-5 h-5 mr-2" />
          <span>Voice Clone</span>
        </button>
        <button
          onClick={goToThreeDModel}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Box className="w-5 h-5 mr-2" />
          <span>3D Model</span>
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/3d-model" element={<ThreeDModelPage />} />
        <Route path="/session-history" element={<SessionHistory />} />
      </Routes>
    </Router>
  );
}

export default App;
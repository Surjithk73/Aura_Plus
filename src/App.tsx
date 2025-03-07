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
    <div className="flex min-h-screen bg-gradient-to-b from-[#0A0A0F] to-[#1A1A23]">
      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full w-72 bg-[#12121A]/95 backdrop-blur-lg text-white flex flex-col shadow-2xl border-r border-[#2A2A35]/20 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#2A2A35]/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-semibold bg-gradient-to-r from-indigo-400 to-violet-400 text-transparent bg-clip-text">Aura +</span>
              <p className="text-xs text-gray-400">Your Personal Therapy Companion</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <button
              onClick={() => setShowVoiceClone(true)}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white rounded-lg transition-all duration-200 hover:bg-indigo-500/10 group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors">
                <MicIcon className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
              </div>
              <span className="font-medium">Voice Clone</span>
            </button>
            
            <button 
              onClick={() => navigate('/session-history')}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white rounded-lg transition-all duration-200 hover:bg-violet-500/10 group"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 flex items-center justify-center transition-colors">
                <History className="w-5 h-5 text-violet-400 group-hover:text-violet-300" />
              </div>
              <span className="font-medium">Session History</span>
            </button>
            
            <button
              onClick={() => navigate('/analysis')}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white rounded-lg transition-all duration-200 hover:bg-emerald-500/10 group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
                <BarChart className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300" />
              </div>
              <span className="font-medium">View Analysis</span>
            </button>

            {/* Emergency Contacts Button */}
            <button
              onClick={() => setShowEmergencyContacts(true)}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white rounded-lg transition-all duration-200 hover:bg-rose-500/10 group"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 flex items-center justify-center transition-colors">
                <Phone className="w-5 h-5 text-rose-400 group-hover:text-rose-300" />
              </div>
              <span className="font-medium">Emergency Contacts</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className={`fixed top-6 z-50 p-2 bg-[#12121A] hover:bg-[#1A1A23] text-white rounded-lg shadow-xl shadow-black/20 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'left-72' : 'left-0'
        }`}
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
        className="fixed top-6 right-6 z-50 flex items-center space-x-2 px-4 py-2 bg-[#12121A]/90 hover:bg-[#1A1A23]/90 text-white rounded-lg shadow-xl shadow-black/20 transition-all duration-200 hover:scale-105 group"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/10 to-violet-500/10 group-hover:from-indigo-500/20 group-hover:to-violet-500/20 flex items-center justify-center transition-colors">
          <Box className="w-5 h-5 text-indigo-400 group-hover:text-violet-400" />
        </div>
        <span className="font-medium bg-gradient-to-r from-indigo-400 to-violet-400 text-transparent bg-clip-text">3D Model</span>
      </button>

      {/* Main content */}
      <div className={`flex-1 flex flex-col items-center justify-center p-6 relative transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'ml-72' : 'ml-0'
      }`}>
        {/* Status indicator */}
        {status && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-[#12121A] px-6 py-2 rounded-full shadow-xl shadow-black/20 border border-[#2A2A35]/20">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'Listening...' ? 'bg-emerald-500 animate-pulse' : 
                  status === 'Thinking...' ? 'bg-amber-500 animate-pulse' : 
                  'bg-indigo-500 animate-pulse'
                }`}></div>
                <span className="text-white font-medium">{status}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* AI Visualization */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative w-40 h-40 rounded-full overflow-hidden shadow-2xl shadow-indigo-500/20">
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
              className="mt-6 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-full shadow-xl shadow-indigo-500/20 transition-all duration-300 transform hover:scale-105"
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
              <div className="flex items-center space-x-12 px-12 py-4 rounded-full bg-[#12121A]/30 backdrop-blur-sm shadow-xl shadow-black/20">
                <button
                  onClick={handleMicClick}
                  className={`p-4 rounded-full shadow-xl transition-all duration-300 transform hover:scale-110 ${
                    aiSpeaking || processing
                      ? 'bg-gray-600 cursor-not-allowed'
                      : isListening
                        ? 'bg-rose-500 hover:bg-rose-600'
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
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
                  className="p-4 rounded-full bg-rose-500 hover:bg-rose-600 shadow-xl transition-all duration-300 transform hover:scale-110"
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
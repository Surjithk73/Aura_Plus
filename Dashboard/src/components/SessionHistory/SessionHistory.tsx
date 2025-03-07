import React, { useState, useEffect } from 'react';
import { Clock, MessageCircle, ChevronLeft, Calendar, Timer, ArrowLeft } from 'lucide-react';
import { ConversationSession } from '../../types/session';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '../../services/sessionService';

const SessionHistory: React.FC = () => {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSessions = async () => {
      const allSessions = await sessionService.getAllSessions();
      setSessions(allSessions);
    };
    loadSessions();
  }, []);

  const handleSessionClick = (session: ConversationSession, index: number) => {
    setSelectedSession(session);
    setSelectedIndex(index);
  };

  const handleBack = () => {
    setSelectedSession(null);
    setSelectedIndex(null);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Session History</h2>
                {selectedSession && selectedIndex !== null && (
                  <p className="text-sm text-gray-400">
                    Session {sessions.length - selectedIndex}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {selectedSession && (
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors flex items-center space-x-2 text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Back to All Sessions</span>
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {sessions.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No sessions found. Start a conversation to create your first session.
              </div>
            ) : selectedSession ? (
              // Detailed Session View
              <div className="space-y-6">
                {/* Session Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 text-gray-400 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">Start Time</span>
                    </div>
                    <p className="text-white">{new Date(selectedSession.startTime).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 text-gray-400 mb-2">
                      <Timer className="w-4 h-4" />
                      <span className="text-sm font-medium">Duration</span>
                    </div>
                    <p className="text-white">{calculateDuration(selectedSession.startTime, selectedSession.endTime)}</p>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 text-gray-400 mb-2">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Messages</span>
                    </div>
                    <p className="text-white">{selectedSession.conversation.length}</p>
                  </div>
                </div>

                {/* Conversation */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Conversation</h3>
                  {selectedSession.conversation.map((msg, index) => (
                    <div key={index} className="space-y-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <p className="text-sm text-blue-300 mb-2">You</p>
                        <p className="text-white">{msg.userMessage}</p>
                      </div>
                      <div className="bg-purple-500/10 p-4 rounded-lg">
                        <p className="text-sm text-purple-300 mb-2">AI</p>
                        <p className="text-white">{msg.aiResponse}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Session Tiles Grid
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((session, index) => (
                  <div
                    key={session.sessionId}
                    onClick={() => handleSessionClick(session, index)}
                    className="bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 transition-all duration-200 cursor-pointer transform hover:scale-102 hover:shadow-lg"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-white font-medium flex items-center">
                          <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md mr-2">
                            Session {sessions.length - index}
                          </span>
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {new Date(session.startTime).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-400">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">{session.conversation.length}</span>
                      </div>
                    </div>

                    {/* Preview of first message */}
                    {session.conversation[0] && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {session.conversation[0].userMessage}
                        </p>
                      </div>
                    )}

                    {/* Session duration */}
                    <div className="mt-3 text-xs text-gray-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{calculateDuration(session.startTime, session.endTime)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Total Sessions: {sessions.length}</span>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate session duration
const calculateDuration = (startTime: string, endTime: string): string => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const durationInMinutes = Math.round((end - start) / (1000 * 60));

  if (durationInMinutes < 1) {
    return 'Less than a minute';
  } else if (durationInMinutes === 1) {
    return '1 minute';
  } else if (durationInMinutes < 60) {
    return `${durationInMinutes} minutes`;
  } else {
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
};

export default SessionHistory; 
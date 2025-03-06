import React, { useState } from 'react';
import { X, Clock, MessageSquare, Calendar, ChevronLeft } from 'lucide-react';

interface SessionHistoryProps {
  onClose: () => void;
  sessions: any[];
}

interface SessionDetailProps {
  session: any;
  onBack: () => void;
}

const SessionDetail: React.FC<SessionDetailProps> = ({ session, onBack }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Sessions</span>
        </button>
      </div>

      {/* Session Info */}
      <div className="bg-gray-800/50 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Date</p>
              <p className="text-white">{new Date(session.startTime).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm text-gray-400">Duration</p>
              <p className="text-white">{session.duration} minutes</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-gray-400">Messages</p>
              <p className="text-white">{session.messageCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Conversation</h3>
        <div className="space-y-4">
          {session.conversation.map((message: any, index: number) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                message.userMessage
                  ? 'bg-blue-500/10 ml-12'
                  : 'bg-gray-800/50 mr-12'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-400">
                  {message.userMessage ? 'You' : 'AI Assistant'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-gray-300">
                {message.userMessage || message.aiResponse}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SessionHistory: React.FC<SessionHistoryProps> = ({ onClose, sessions }) => {
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const handleSessionClick = (session: any) => {
    setSelectedSession(session);
  };

  const handleBack = () => {
    setSelectedSession(null);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Session History</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        {selectedSession ? (
          <SessionDetail session={selectedSession} onBack={handleBack} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sessions.map((session, index) => (
              <button
                key={session.sessionId}
                onClick={() => handleSessionClick(session)}
                className="bg-gray-800/50 rounded-xl p-6 text-left hover:bg-gray-800 transition-colors border border-gray-700/50 hover:border-gray-600/50"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-lg font-medium text-white">
                    Session {sessions.length - index}
                  </span>
                  <span className="text-sm text-gray-400">
                    {new Date(session.startTime).toLocaleDateString()}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-400">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{session.duration} minutes</span>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span>{session.messageCount} messages</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionHistory; 
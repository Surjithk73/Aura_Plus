import React from 'react';
import { SessionCard } from './SessionCard';
import { SessionDetail } from './SessionDetail';
import { ConversationSession } from '../../types';

interface HistoryViewProps {
  sessions: ConversationSession[];
  selectedSessionData: ConversationSession | null;
  showSessionDetail: boolean;
  onSelectSession: (session: ConversationSession) => void;
  onBack: () => void;
  onClose: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  selectedSessionData,
  showSessionDetail,
  onSelectSession,
  onBack,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-gray-800 z-50 overflow-y-auto">
      <div className="min-h-screen w-full">
        {/* Header */}
        <div className="bg-gray-800 shadow-lg sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <button 
                  onClick={onClose}
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
                  <SessionCard
                    key={session.$id}
                    session={session}
                    index={index}
                    totalSessions={sessions.length}
                    onSelect={() => onSelectSession(session)}
                  />
                ))}
            </div>
          </div>
        ) : selectedSessionData ? (
          <SessionDetail
            session={selectedSessionData}
            onBack={onBack}
            onClose={onClose}
          />
        ) : null}
      </div>
    </div>
  );
}; 
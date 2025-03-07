import React from 'react';
import { ConversationSession } from '../../types';

interface SessionCardProps {
  session: ConversationSession;
  index: number;
  totalSessions: number;
  onSelect: () => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  index,
  totalSessions,
  onSelect,
}) => {
  return (
    <div 
      onClick={onSelect}
      className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
    >
      <div className="flex flex-col h-full">
        <div className="mb-4 pb-4 border-b border-gray-700">
          <span className="text-blue-400 font-semibold text-xl block mb-2">
            Session {totalSessions - index}
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
  );
}; 
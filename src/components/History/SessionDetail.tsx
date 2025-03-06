import React from 'react';
import { ConversationSession } from '../../types';

interface SessionDetailProps {
  session: ConversationSession;
  onBack: () => void;
  onClose: () => void;
}

export const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  onBack,
  onClose,
}) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gray-800 rounded-xl shadow-xl p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={onBack}
                className="text-blue-400 hover:text-blue-300 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Sessions
              </button>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <h2 className="text-xl font-semibold text-white mt-4">Session Details</h2>
          <div className="text-gray-400 text-sm mt-1">
            {new Date(session.startTime).toLocaleDateString()} • 
            {new Date(session.startTime).toLocaleTimeString()} - 
            {new Date(session.endTime).toLocaleTimeString()}
          </div>
        </div>
        
        <div className="space-y-6">
          {session.conversation.map((conv, idx) => (
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
  );
}; 
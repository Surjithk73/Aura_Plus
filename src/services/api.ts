import { ConversationSession, Conversation } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

export const sessionApi = {
  getAllSessions: async (): Promise<ConversationSession[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/all`);
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  },

  getSessionById: async (sessionId: string): Promise<ConversationSession | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  },

  startSession: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/start`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to start session');
      }
      return response.json();
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  },

  addMessageToSession: async (conversation: Conversation) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/current`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversation),
      });
      if (!response.ok) {
        throw new Error('Failed to add message');
      }
      return response.json();
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  },

  endSession: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/current/end`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to end session');
      }
      return response.json();
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  },
}; 
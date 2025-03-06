import { Conversation, ConversationSession } from '../types/session';

const API_BASE_URL = 'http://localhost:8080/api';

const STORAGE_KEYS = {
  CURRENT_SESSION: 'current_session',
  ALL_SESSIONS: 'all_sessions',
  SESSION_STARTED: 'session_started',
  CURRENT_SESSION_ID: 'current_session_id'
};

class SessionService {
  private static instance: SessionService;
  private sessions: ConversationSession[] = [];
  private currentSessionId: string | null = null;

  private constructor() {
    this.initializeFromStorage();
  }

  private initializeFromStorage() {
    const storedSessions = localStorage.getItem(STORAGE_KEYS.ALL_SESSIONS);
    if (storedSessions) {
      this.sessions = JSON.parse(storedSessions);
    }
    this.currentSessionId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);
  }

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  private async syncWithServer() {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/all`);
      if (response.ok) {
        const serverSessions = await response.json();
        this.sessions = serverSessions;
        localStorage.setItem(STORAGE_KEYS.ALL_SESSIONS, JSON.stringify(serverSessions));
      }
    } catch (error) {
      console.error('Error syncing with server:', error);
    }
  }

  async getAllSessions(): Promise<ConversationSession[]> {
    try {
      // Return cached sessions immediately
      if (this.sessions.length > 0) {
        return this.sessions;
      }

      // Try to get from localStorage
      const storedSessions = localStorage.getItem(STORAGE_KEYS.ALL_SESSIONS);
      if (storedSessions) {
        this.sessions = JSON.parse(storedSessions);
        return this.sessions;
      }

      // If no cached data, fetch from server
      await this.syncWithServer();
      return this.sessions;
    } catch (error) {
      console.error('Error fetching all sessions:', error);
      return this.sessions;
    }
  }

  async getSessionById(sessionId: string): Promise<ConversationSession | null> {
    try {
      // First check in memory
      let session = this.sessions.find(s => s.sessionId === sessionId);
      if (session) return session;

      // Then check localStorage
      const storedSessions = localStorage.getItem(STORAGE_KEYS.ALL_SESSIONS);
      if (storedSessions) {
        const sessions = JSON.parse(storedSessions);
        session = sessions.find((s: ConversationSession) => s.sessionId === sessionId);
        if (session) return session;
      }

      // Finally, try server
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        // Update local cache
        this.updateSessionInCache(data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching session by ID:', error);
      return null;
    }
  }

  private updateSessionInCache(session: ConversationSession) {
    const index = this.sessions.findIndex(s => s.sessionId === session.sessionId);
    if (index >= 0) {
      this.sessions[index] = session;
    } else {
      this.sessions.push(session);
    }
    localStorage.setItem(STORAGE_KEYS.ALL_SESSIONS, JSON.stringify(this.sessions));
  }

  async startSession(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/start`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const newSession = await response.json();
        this.currentSessionId = newSession.sessionId;
        localStorage.setItem(STORAGE_KEYS.SESSION_STARTED, 'true');
        localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, newSession.sessionId);
        this.updateSessionInCache(newSession);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error starting session:', error);
      return false;
    }
  }

  async endSession(): Promise<boolean> {
    try {
      if (!this.currentSessionId) return false;

      const response = await fetch(`${API_BASE_URL}/sessions/current/end`, {
        method: 'POST',
      });

      if (response.ok) {
        // Clear session data from localStorage
        localStorage.removeItem(STORAGE_KEYS.SESSION_STARTED);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID);
        this.currentSessionId = null;
        
        // Sync with server to get updated sessions
        await this.syncWithServer();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }

  async saveConversation(conversation: Conversation): Promise<boolean> {
    try {
      // Update local storage first
      const currentSession = this.getCurrentSession();
      const updatedSession = [...currentSession, conversation];
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(updatedSession));

      // Then update server
      const response = await fetch(`${API_BASE_URL}/sessions/current`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...conversation,
          sessionId: this.currentSessionId
        }),
      });

      if (response.ok) {
        // Update the sessions cache
        await this.syncWithServer();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving conversation:', error);
      return false;
    }
  }

  getCurrentSession(): Conversation[] {
    const storedSession = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    return storedSession ? JSON.parse(storedSession) : [];
  }

  isSessionStarted(): boolean {
    return localStorage.getItem(STORAGE_KEYS.SESSION_STARTED) === 'true';
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
}

export const sessionService = SessionService.getInstance(); 
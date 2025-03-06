import { useState, useEffect } from 'react';
import { ConversationSession, Conversation } from '../types';
import { sessionApi } from '../services/api';

export const useSessions = () => {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [currentSession, setCurrentSession] = useState<Conversation[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedSessionData, setSelectedSessionData] = useState<ConversationSession | null>(null);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const fetchSessions = async () => {
    const data = await sessionApi.getAllSessions();
    setSessions(data);
  };

  const fetchSessionById = async (sessionId: string) => {
    const data = await sessionApi.getSessionById(sessionId);
    if (data) {
      setSelectedSessionData(data);
      setShowSessionDetail(true);
    }
  };

  useEffect(() => {
    if (selectedSession) {
      fetchSessionById(selectedSession);
    }
  }, [selectedSession]);

  const beginSession = async () => {
    try {
      await sessionApi.startSession();
      setSessionStarted(true);
      return true;
    } catch (error) {
      console.error('Error starting session:', error);
      return false;
    }
  };

  const addMessageToSession = async (conversation: Conversation) => {
    try {
      await sessionApi.addMessageToSession(conversation);
      setCurrentSession(prev => [...prev, conversation]);
    } catch (error) {
      console.error('Error adding message:', error);
    }
  };

  const endSession = async () => {
    try {
      await sessionApi.endSession();
      setCurrentSession([]);
      setSessionStarted(false);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  return {
    sessions,
    currentSession,
    selectedSession,
    selectedSessionData,
    showSessionDetail,
    sessionStarted,
    fetchSessions,
    setSelectedSession,
    setShowSessionDetail,
    beginSession,
    addMessageToSession,
    endSession,
    setSessionStarted,
  };
}; 
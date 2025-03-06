export interface Conversation {
  timestamp: string;
  userMessage: string;
  aiResponse: string;
}

export interface ConversationSession {
  $id: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  conversation: Conversation[];
  messageCount: number;
}

export interface CurrentSession {
  startTime: string;
  conversation: Conversation[];
} 
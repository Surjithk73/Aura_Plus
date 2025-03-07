import { ID } from 'appwrite';
import { databases, CONVERSATIONS_DATABASE_ID, CONVERSATIONS_COLLECTION_ID } from '../config/appwrite';

export interface Conversation {
    userMessage: string;
    aiResponse: string;
    timestamp: Date;
}

export const conversationService = {
    // Save a new conversation entry
    async saveConversation(userMessage: string, aiResponse: string): Promise<void> {
        try {
            await databases.createDocument(
                CONVERSATIONS_DATABASE_ID,
                CONVERSATIONS_COLLECTION_ID,
                ID.unique(),
                {
                    userMessage,
                    aiResponse,
                    timestamp: new Date().toISOString(),
                }
            );
        } catch (error) {
            console.error('Error saving conversation:', error);
            throw error;
        }
    },

    // Get conversation history
    async getConversationHistory(): Promise<Conversation[]> {
        try {
            const response = await databases.listDocuments(
                CONVERSATIONS_DATABASE_ID,
                CONVERSATIONS_COLLECTION_ID
            );
            
            return response.documents.map(doc => ({
                userMessage: doc.userMessage,
                aiResponse: doc.aiResponse,
                timestamp: new Date(doc.timestamp),
            }));
        } catch (error) {
            console.error('Error fetching conversation history:', error);
            throw error;
        }
    },
}; 
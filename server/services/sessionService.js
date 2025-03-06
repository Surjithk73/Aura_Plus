const { ID } = require('node-appwrite');
const { databases, CONVERSATIONS_DATABASE_ID, CONVERSATIONS_COLLECTION_ID } = require('../config/appwrite');

class SessionService {
    async getAllSessions() {
        try {
            console.log('Fetching conversation sessions...');
            const response = await databases.listDocuments(
                CONVERSATIONS_DATABASE_ID,
                CONVERSATIONS_COLLECTION_ID
            );
            
            // Parse conversation strings back to arrays
            const sessions = response.documents.map(doc => {
                try {
                    return {
                        ...doc,
                        conversation: JSON.parse(doc.conversation)
                    };
                } catch (error) {
                    console.error('Error parsing conversation for session:', doc.$id);
                    return doc;
                }
            });
            
            return sessions;
        } catch (error) {
            console.error('Error fetching sessions:', error);
            throw error;
        }
    }

    async getSessionById(sessionId) {
        try {
            const document = await databases.getDocument(
                CONVERSATIONS_DATABASE_ID,
                CONVERSATIONS_COLLECTION_ID,
                sessionId
            );
            return {
                ...document,
                conversation: JSON.parse(document.conversation)
            };
        } catch (error) {
            console.error('Error fetching session:', error);
            throw error;
        }
    }

    async storeSession(session) {
        try {
            console.log('Attempting to store session:', {
                startTime: session.startTime,
                messageCount: session.conversation.length
            });

            const conversationString = JSON.stringify(session.conversation);
            const documentId = ID.unique();
            const sessionId = ID.unique();
            
            const document = await databases.createDocument(
                CONVERSATIONS_DATABASE_ID,
                CONVERSATIONS_COLLECTION_ID,
                documentId,
                {
                    sessionId: sessionId,
                    startTime: session.startTime,
                    endTime: new Date().toISOString(),
                    conversation: conversationString,
                    messageCount: session.conversation.length
                }
            );
            
            return document;
        } catch (error) {
            console.error('Error storing session:', error);
            throw error;
        }
    }
}

module.exports = new SessionService(); 
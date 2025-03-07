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
            
            // Parse conversation strings back to arrays and format dates
            const sessions = response.documents.map(doc => {
                try {
                    const conversation = JSON.parse(doc.conversation);
                    return {
                        ...doc,
                        conversation,
                        formattedStartTime: new Date(doc.startTime).toLocaleString(),
                        formattedEndTime: new Date(doc.endTime).toLocaleString(),
                        duration: Math.round((new Date(doc.endTime).getTime() - new Date(doc.startTime).getTime()) / 60000)
                    };
                } catch (error) {
                    console.error('Error parsing conversation for session:', doc.sessionId);
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

            // Parse conversation and format dates
            const conversation = JSON.parse(document.conversation);
            return {
                ...document,
                conversation,
                formattedStartTime: new Date(document.startTime).toLocaleString(),
                formattedEndTime: new Date(document.endTime).toLocaleString(),
                duration: Math.round((new Date(document.endTime).getTime() - new Date(document.startTime).getTime()) / 60000)
            };
        } catch (error) {
            console.error('Error fetching session:', error);
            throw error;
        }
    }

    async storeSession(session) {
        try {
            console.log('Storing session:', {
                sessionId: session.sessionId,
                startTime: session.startTime,
                endTime: session.endTime,
                messageCount: session.messageCount
            });

            // Ensure conversation is properly stringified
            const conversationString = JSON.stringify(session.conversation);
            
            const document = await databases.createDocument(
                CONVERSATIONS_DATABASE_ID,
                CONVERSATIONS_COLLECTION_ID,
                session.sessionId, // Use the sessionId as the document ID
                {
                    sessionId: session.sessionId,
                    startTime: session.startTime,
                    endTime: session.endTime,
                    messageCount: session.messageCount,
                    conversation: conversationString
                }
            );
            
            // Return parsed data
            return {
                ...document,
                conversation: JSON.parse(document.conversation),
                formattedStartTime: new Date(document.startTime).toLocaleString(),
                formattedEndTime: new Date(document.endTime).toLocaleString(),
                duration: Math.round((new Date(document.endTime).getTime() - new Date(document.startTime).getTime()) / 60000)
            };
        } catch (error) {
            console.error('Error storing session:', error);
            throw error;
        }
    }
}

module.exports = new SessionService(); 
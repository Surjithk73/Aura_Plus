const sessionService = require('../services/sessionService');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ID = require('../utils/id');

// Initialize Gemini Flash 2.0
const genAI = new GoogleGenerativeAI('AIzaSyCT43QYBuN8a4dA8Pq6i9wxXmgHPPnO8a0');

let currentSession = null;

class SessionController {
    async getAllSessions(req, res) {
        try {
            const sessions = await sessionService.getAllSessions();
            // Sort sessions by start time in descending order (newest first)
            const sortedSessions = sessions.sort((a, b) => 
                new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );
            res.json(sortedSessions);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch sessions' });
        }
    }

    async getSessionById(req, res) {
        try {
            const session = await sessionService.getSessionById(req.params.id);
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
            
            // Format the session data for display
            const formattedSession = {
                ...session,
                duration: Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000),
                formattedStartTime: new Date(session.startTime).toLocaleString(),
                formattedEndTime: new Date(session.endTime).toLocaleString()
            };
            
            res.json(formattedSession);
        } catch (error) {
            res.status(404).json({ error: 'Session not found' });
        }
    }

    async startSession(req, res) {
        try {
            currentSession = {
                sessionId: ID.unique(),
                startTime: new Date().toISOString(),
                conversation: []
            };
            res.status(201).json(currentSession);
        } catch (error) {
            res.status(500).json({ error: 'Failed to start session' });
        }
    }

    async addMessageToSession(req, res) {
        try {
            if (!currentSession) {
                return res.status(400).json({ error: 'No active session' });
            }
            // Add timestamp to each message
            const messageWithTimestamp = {
                ...req.body,
                timestamp: new Date().toISOString()
            };
            currentSession.conversation.push(messageWithTimestamp);
            res.json(currentSession);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update session' });
        }
    }

    async endSession(req, res) {
        try {
            if (!currentSession) {
                return res.status(400).json({ error: 'No active session' });
            }

            // Ensure all required fields are present
            const sessionToStore = {
                sessionId: currentSession.sessionId,
                startTime: currentSession.startTime,
                endTime: new Date().toISOString(),
                messageCount: currentSession.conversation.length,
                conversation: currentSession.conversation
            };

            const storedSession = await sessionService.storeSession(sessionToStore);
            currentSession = null;
            res.json(storedSession);
        } catch (error) {
            console.error('Error ending session:', error);
            res.status(500).json({ error: 'Failed to end session' });
        }
    }

    async analyzeSession(req, res) {
        try {
            const sessions = await sessionService.getAllSessions();
            
            // Format session data for analysis
            const formattedData = sessions.map(session => ({
                sessionId: session.sessionId,
                duration: Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000),
                messageCount: session.messageCount,
                date: new Date(session.startTime).toLocaleDateString(),
                conversations: session.conversation
            }));

            // Create analysis prompt
            const analysisPrompt = `
                As a professional therapist, analyze this therapy session data and provide 4 key insights.
                Focus on the following aspects:
                1. Engagement patterns and session duration trends
                2. Common themes or topics in user messages
                3. Emotional progression throughout sessions
                4. Areas for potential improvement in therapeutic interaction

                Session Data Summary:
                - Total Sessions: ${sessions.length}
                - Total Duration: ${formattedData.reduce((acc, session) => acc + session.duration, 0)} minutes
                - Average Messages per Session: ${Math.round(formattedData.reduce((acc, session) => acc + session.messageCount, 0) / sessions.length)}

                Detailed Session Data: ${JSON.stringify(formattedData, null, 2)}

                Please provide insights in a clear, numbered format.
            `;

            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const result = await model.generateContent(analysisPrompt);
            const response = await result.response;
            const insights = response.text()
                .split('\n')
                .filter(line => line.trim().match(/^\d+\./))
                .map(insight => insight.trim());

            // Calculate metrics based on the exact schema attributes
            const metrics = {
                totalSessions: sessions.length,
                totalDuration: formattedData.reduce((acc, session) => acc + session.duration, 0),
                averageMessages: Math.round(formattedData.reduce((acc, session) => acc + session.messageCount, 0) / sessions.length),
                sessionData: formattedData.map(session => ({
                    sessionId: session.sessionId,
                    duration: session.duration,
                    messageCount: session.messageCount,
                    date: session.date
                }))
            };

            res.json({ insights, metrics });
        } catch (error) {
            console.error('Error analyzing sessions:', error);
            res.status(500).json({ error: 'Failed to analyze sessions' });
        }
    }
}

module.exports = new SessionController(); 
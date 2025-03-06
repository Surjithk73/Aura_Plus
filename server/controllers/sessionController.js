const sessionService = require('../services/sessionService');

let currentSession = null;

class SessionController {
    async getAllSessions(req, res) {
        try {
            const sessions = await sessionService.getAllSessions();
            res.json(sessions);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch sessions' });
        }
    }

    async getSessionById(req, res) {
        try {
            const session = await sessionService.getSessionById(req.params.id);
            res.json(session);
        } catch (error) {
            res.status(404).json({ error: 'Session not found' });
        }
    }

    async startSession(req, res) {
        try {
            currentSession = {
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
            currentSession.conversation.push(req.body);
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
            const storedSession = await sessionService.storeSession(currentSession);
            currentSession = null;
            res.json(storedSession);
        } catch (error) {
            res.status(500).json({ error: 'Failed to end session' });
        }
    }
}

module.exports = new SessionController(); 
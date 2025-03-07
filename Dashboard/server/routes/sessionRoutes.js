const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// Get all sessions
router.get('/all', sessionController.getAllSessions);

// Get session by ID
router.get('/:id', sessionController.getSessionById);

// Start new session
router.post('/start', sessionController.startSession);

// Add message to current session
router.post('/current', sessionController.addMessageToSession);

// End current session
router.post('/current/end', sessionController.endSession);

// Analyze sessions
router.post('/analyze', sessionController.analyzeSession);

module.exports = router; 
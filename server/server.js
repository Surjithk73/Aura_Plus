// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sessionRoutes = require('./routes/sessionRoutes');
const setupWebSocket = require('./websocket/wsHandler');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/sessions', sessionRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Setup WebSocket
const wss = setupWebSocket(app);

console.log('WebSocket server is running on ws://localhost:8080');
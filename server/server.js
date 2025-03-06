// server.js
const express = require('express');
const cors = require('cors');
const sessionRoutes = require('./routes/sessionRoutes');
const setupWebSocket = require('./websocket/wsHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/sessions', sessionRoutes);

// Start server
const PORT = 8080;
const server = app.listen(PORT, () => {
    console.log(`REST API server is running on http://localhost:${PORT}`);
});

// Setup WebSocket
const wss = setupWebSocket(server);

console.log('WebSocket server is running on ws://localhost:8080');
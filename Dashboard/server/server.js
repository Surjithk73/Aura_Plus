// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sessionRoutes = require('./routes/sessionRoutes');
const avatarRoutes = require('./routes/avatarRoutes');
const setupWebSocket = require('./websocket/wsHandler');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// For parsing application/json
app.use(express.json());
// For parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use('/models', express.static(path.join(__dirname, '../public/models')));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/avatar', avatarRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Server directory: ${__dirname}`);
  console.log(`Models directory: ${path.join(__dirname, '../public/models')}`);
});

// Setup WebSocket
const wss = setupWebSocket(server);

console.log('WebSocket server is running on ws://localhost:8080');
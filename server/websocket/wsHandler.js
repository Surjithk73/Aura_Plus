const WebSocket = require('ws');
const sessionService = require('../services/sessionService');

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('Client connected');
        
        let wsSession = {
            startTime: new Date().toISOString(),
            conversation: []
        };
        let sessionEnded = false;

        // Send conversation history when client connects
        sessionService.getAllSessions().then(sessions => {
            ws.send(JSON.stringify({
                type: 'history',
                data: sessions
            }));
        });

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                console.log('Received message type:', data.type);
                
                switch (data.type) {
                    case 'conversation':
                        if (sessionEnded) {
                            console.log('Session already ended, ignoring new message');
                            return;
                        }
                        wsSession.conversation.push({
                            timestamp: new Date().toISOString(),
                            userMessage: data.userMessage,
                            aiResponse: data.aiResponse
                        });
                        console.log('Added message to session. Total messages:', wsSession.conversation.length);
                        break;

                    case 'endSession':
                        console.log('End session requested. Messages:', wsSession.conversation.length);
                        
                        if (sessionEnded) {
                            console.log('Session already ended and stored');
                            return;
                        }
                        
                        if (wsSession.conversation.length > 0) {
                            console.log('Storing session...');
                            const stored = await sessionService.storeSession(wsSession);
                            console.log('Store operation result:', stored);
                            
                            if (stored) {
                                sessionEnded = true;
                                const updatedSessions = await sessionService.getAllSessions();
                                wss.clients.forEach(client => {
                                    if (client.readyState === WebSocket.OPEN) {
                                        client.send(JSON.stringify({
                                            type: 'history',
                                            data: updatedSessions
                                        }));
                                    }
                                });
                            }
                            wsSession = {
                                startTime: new Date().toISOString(),
                                conversation: []
                            };
                            console.log('Session reset after storage');
                        }
                        break;

                    case 'getHistory':
                        const sessions = await sessionService.getAllSessions();
                        ws.send(JSON.stringify({
                            type: 'history',
                            data: sessions
                        }));
                        break;

                    default:
                        console.log('Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });

    return wss;
}

module.exports = setupWebSocket; 
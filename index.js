const WebSocketServer = require('./services/WebSocketServer');

const PORT = process.env.WS_PORT || 3000;
const webSocketServer = new WebSocketServer(PORT);
webSocketServer.start();
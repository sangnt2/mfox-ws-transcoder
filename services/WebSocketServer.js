const http = require('http');
const WebSocket = require('ws');
const Client = require('./Client');

class WebSocketServer {
    constructor(port) {
        this.port = port;
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });
        this.clientSubscriptions = new Map();

        this.wss.on('connection', this.onConnection.bind(this));
    }

    onConnection(ws) {
        console.log('What\'s up my client?');
        const clientInstance = new Client(ws, this);
    }

    subscribeClient(ws, streamKey) {
        if (!this.clientSubscriptions.has(streamKey)) {
            this.clientSubscriptions.set(streamKey, new Set());
        }
        this.clientSubscriptions.get(streamKey).add(ws);

        ws.on('close', () => {
            this.unsubscribeClient(ws, streamKey);
        });
    }

    unsubscribeClient(ws, streamKey) {
        if (this.clientSubscriptions.has(streamKey)) {
            const clients = this.clientSubscriptions.get(streamKey);
            clients.delete(ws);
            if (clients.size === 0) {
                this.clientSubscriptions.delete(streamKey);
            }
        }
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`WebSocket server is listening on port ${this.port}`);
        });
    }
}

module.exports = WebSocketServer;
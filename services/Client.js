const crypto = require('crypto');
const { generateToken, verifyToken } = require('../auth/jwtService');
const { validateUserInMetaFox, validateUserStreamKey } = require('../auth/authHandler');
const { ERROR_MESSAGES } = require('../utils/constants');
const wsMessageValidate = require('../schemas/wsMessageSchema');
const FFmpegHandler = require('../transcoder/ffmpegHandler');
const { endLiveByStreamKey } = require('../utils/metafox');

class Client {
    constructor(ws, server) {
        this.ws = ws;
        this.server = server;
        this.bearerToken = null;
        this.validatedStreamKey = null;
        this.ffmpegHandler = null;
        this.startStream = false;
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;

        this.initializeEventHandlers();
        this.startHeartbeat();
    }

    initializeEventHandlers() {
        this.ws.on('message', this.onMessage.bind(this));
        this.ws.on('close', this.onClose.bind(this));
        this.ws.on('error', this.onError.bind(this));
    }

    startHeartbeat() {
        const interval = 30000;
        this.heartbeatInterval = setInterval(() => {
            if (this.ws.readyState === this.ws.OPEN) {
                this.sendMessage('ping');

                this.heartbeatTimeout = setTimeout(() => {
                    console.error('No pong received, closing connection');
                    if (this.validateStreamkey && this.bearerToken) {
                        endLiveByStreamKey(this.validatedStreamKey, this.bearerToken).then(() => {
                            console.log('Live ended successfully');
                        }).catch((error) => {
                            console.error('Error ending live:', error);
                        });
                    }
                    this.ws.close();
                }, 15000);
            }
        }, interval);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }

    async onMessage(msg) {
        try {
            const data = this.startStream ? this.safeParseMessage(msg) : this.parseMessage(msg);
            if (!data || !this.validateMessage(data)) return;

            await this.handleMessageType(data);
        } catch (error) {
            this.handleMessageError(error);
        }
    }

    onPong() {
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout); 
            this.heartbeatTimeout = null;
        }
    }

    parseMessage(msg) {
        try {
            return JSON.parse(msg);
        } catch (error) {
            throw new Error(ERROR_MESSAGES.INVALID_MESSAGE_RECEIVED);
        }
    }

    safeParseMessage(msg) {
        try {
            return JSON.parse(msg);
        } catch (error) {
            this.processStreamData(msg);
            return null;
        }
    }

    validateMessage(data) {
        const isValid = wsMessageValidate(data);
        if (!isValid) {
            this.sendError(ERROR_MESSAGES.INVALID_MESSAGE_RECEIVED);
        }
        return isValid;
    }

    async handleMessageType(data) {
        const messageHandlers = {
            'connect': this.handleConnect,
            'method': this.handleMethod,
            'pong': this.onPong,
        };

        const handler = messageHandlers[data.msg] || this.handleUnknownAction;
        await handler.call(this, data);
    }

    handleUnknownAction() {
        this.sendError('Unknown action');
    }

    handleConnect() {
        const session = crypto.randomBytes(16).toString('hex');
        this.sendMessage('connected', { session });
    }

    sendMessage(messageType, payload = {}) {
        this.ws.send(JSON.stringify({ msg: messageType, ...payload }));
    }

    sendError(errorMessage) {
        this.sendMessage('system', { error: ERROR_MESSAGES[errorMessage] || errorMessage });
    }

    async handleMethod(data) {
        const methodHandlers = {
            '__oauthLogin': this.handleOAuthLogin,
            'login': this.handleLogin,
            '__init': this.handleInit,
            'streaming': this.handleStreaming
        };

        const handler = methodHandlers[data.method];
        if (handler) {
            await handler.call(this, data);
        }
    }

    async handleOAuthLogin(data) {
        try {
            const response = await validateUserInMetaFox(data);
            if (!response) return;

            const token = generateToken({
                user: response.data,
                bearerToken: response.bearerToken
            });
            
            this.sendSystemUpdate('result/__oauthLogin');
            this.sendResult('result/__oauthLogin', { authToken: token });
        } catch (error) {
            console.error('Error validating user:', error);
        }
    }

    handleLogin(data) {
        const decodedData = verifyToken(data.params[0].resume);
        if (!decodedData) return;

        this.bearerToken = decodedData.bearerToken;
        this.sendResult('result/login', { id: decodedData.user.data.id });
        this.sendSystemUpdate('result/login');
    }

    async handleInit(data) {
        this.sendSystemUpdate(data.id);
        this.sendResult(data.id, [{}]);

        if (this.ffmpegHandler) {
            await this.ffmpegHandler.stop();
        }
    }

    sendSystemUpdate(method) {
        this.sendMessage('updated', { method: [method] });
    }

    sendResult(id, result) {
        this.sendMessage('result', { id, result });
    }

    async handleStreaming(data) {
        if (!this.bearerToken) {
            return this.sendError('UNAUTHORIZED');
        }

        try {
            if (!this.validatedStreamKey) {
                const streamKey = data.params[0];

                await this.validateStreamkey(streamKey);

                this.sendResult('result/streaming', [{}]);

                this.startStream = true;
                this.validatedStreamKey = streamKey;
                this.server.subscribeClient(this.ws, streamKey);

                this.ffmpegHandler = new FFmpegHandler(streamKey, this.ws);

                this.ffmpegHandler.onError = (message) => {
                    console.error(message);
                    endLiveByStreamKey(streamKey, this.bearerToken);
                    this.ws.close(); 
                };

                this.ffmpegHandler.onExit = (code) => {
                    if (code !== 1) {
                        console.error('FFMPEG exited with code:', code);
                    }
                }

                this.ffmpegHandler.start();
            }
        } catch (error) {
            console.error('Streaming error:', error);
        }
    }

    async validateStreamkey(streamKey) {
        const isValid = await validateUserStreamKey(streamKey, this.bearerToken);
        if (!isValid) return this.sendResult('result/streaming', { error: 'INVALID_STREAM_KEY', msg: 'invalid_stream_key' });
    }

    processStreamData(data) {
        this.ffmpegHandler.writeBuffer(data);
    }

    handleMessageError(error) {
        console.error('Message processing error:', error);
        this.sendError('INVALID_MESSAGE_RECEIVED');
    }

    async onClose() {
        console.log('Client disconnected');
        this.stopHeartbeat();
        this.server.unsubscribeClient(this.ws);
        await this.cleanupFFmpeg();
        this.ffmpegHandler = null;
        this.validatedStreamKey = null;
        this.bearerToken = null;
        this.startStream = false;
    }

    async cleanupFFmpeg() {
        if (this.ffmpegHandler) {
            await this.ffmpegHandler.stop();
        }
    }

    onError(error) {
        console.error('WebSocket error:', error);
        this.stopHeartbeat();
        this.ws.close();
    }
}

module.exports = Client;
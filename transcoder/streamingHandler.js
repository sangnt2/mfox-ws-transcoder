class StreamingHandler {
    constructor(streamKey) {
        if (new.target === StreamingHandler) {
            throw new TypeError("Cannot construct StreamingHandler instances directly");
        }
        this.streamKey = streamKey;
    }

    start() {
        throw new Error("Method 'start()' must be implemented.");
    }

    writeBuffer(data) {
        throw new Error("Method 'writeBuffer()' must be implemented.");
    }

    stop() {
        throw new Error("Method 'stop()' must be implemented.");
    }
}

module.exports = StreamingHandler;
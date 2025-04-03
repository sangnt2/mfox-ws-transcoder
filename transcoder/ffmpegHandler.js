const child_process = require('child_process');
const {
    muxCommandArgs,
    muxGreatQualityCommandArgs,
    muxGoodQualityCommandArgs,
    muxWorkableQualityCommandArgs
} = require('./ffmpegCommandArgs');
const StreamingHandler = require('./streamingHandler');

require('dotenv').config();

const DEBUG_MODE = process.env.NODE_ENV === 'development';

class FFmpegHandler extends StreamingHandler {
    constructor(streamKey, ws, quality = 'workable') {
        super(streamKey);
        this.quality = quality;
        this.ffmpegProcess = null;
        this.ws = ws;
        this.onExit = null;
        this.onError = null;
        this.qualityPresets = {
            workable: muxWorkableQualityCommandArgs,
            good: muxGoodQualityCommandArgs,
            great: muxGreatQualityCommandArgs,
            default: muxCommandArgs
        };
    }

    start() {
        const commandArgs = this.buildCommandArguments();
        this.ffmpegProcess = this.spawnFFmpegProcess(commandArgs);
        this.setupProcessListeners();
    }

    buildCommandArguments() {
        const args = [...(this.qualityPresets[this.quality] || this.qualityPresets.default)];
        
        if (DEBUG_MODE) {
            args.unshift('-loglevel', 'debug');
        }
        
        args.unshift('-i', 'pipe:0');
        args.push(`rtmp://global-live.mux.com/app/${this.streamKey}`);
        
        return args;
    }

    spawnFFmpegProcess(args) {
        return child_process.spawn('ffmpeg', args);
    }

    setupProcessListeners() {
        this.ffmpegProcess.stderr.on('data', this.handleStderrData);
        this.ffmpegProcess.on('close', (code) => {
            if (this.onExit) this.onExit(parseInt(code));
        });
        this.ffmpegProcess.on('error', (err) => {
            if (this.onError) this.onError('FFMPEG process encountered an error');        
        });
        this.ffmpegProcess.stdin.on('error', this.handleStdinError);
    }

    handleStderrData(data) {
        console.error('FFMPEG stderr:', data.toString());
    }

    handleStdinError(err) {
        if (err.code !== 'EPIPE') {
            console.error('FFMPEG stdin error:', err);
        }
    }

    writeBuffer(data) {
        if (this.ffmpegProcess && this.ffmpegProcess.stdin.writable) {
            this.ffmpegProcess.stdin.write(data);
        }
    }

    stop() {
        return new Promise((resolve, reject) => {
            if (!this.ffmpegProcess) return resolve();

            this.ffmpegProcess.on('close', () => {
                console.log('FFMPEG process stopped');
                resolve();
            });

            this.ffmpegProcess.on('error', reject);
            this.ffmpegProcess.kill('SIGINT');
        });
    }

    restart() {
        console.log('Restarting FFMPEG process');
        this.stop().then(() => this.start());
    }
}

module.exports = FFmpegHandler;
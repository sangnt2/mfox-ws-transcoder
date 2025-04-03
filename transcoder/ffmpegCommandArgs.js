// ffmpegCommandArgs.js
const baseCommandArgs = [
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-profile:v', 'main',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-r', '30',
    '-f', 'flv',
    '-use_wallclock_as_timestamps', '1',
];

const muxCommandArgs = [
    ...baseCommandArgs,
];

const muxGreatQualityCommandArgs = [
    ...baseCommandArgs,
    '-b:v', '5000k',
    '-maxrate', '5000k',
    '-bufsize', '10000k',
    '-g', '60',
    '-s', '1920x1080',
];

const muxGoodQualityCommandArgs = [
    ...baseCommandArgs,
    '-b:v', '3500k',
    '-maxrate', '3500k',
    '-bufsize', '7000k',
    '-g', '60',
    '-s', '1280x720',
];

const muxWorkableQualityCommandArgs = [
    ...baseCommandArgs,
    '-b:v', '1000k',
    '-maxrate', '1000k',
    '-bufsize', '2000k',
    '-g', '150',
    '-s', '854x480',
];

module.exports = {
    muxCommandArgs,
    muxGreatQualityCommandArgs,
    muxGoodQualityCommandArgs,
    muxWorkableQualityCommandArgs,
};
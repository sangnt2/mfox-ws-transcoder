const axios = require('axios');

require('dotenv').config();

const MFOX_BASE_API_URL = process.env.MFOX_BASE_API_URL;

async function endLiveByStreamKey(streamKey, bearerToken) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`
    };

    try {
        const liveVideoResponse = await axios.get(`${MFOX_BASE_API_URL}/live-video/live-video-by-key?stream_key=${streamKey}`, {headers: headers});
        const liveVideoId = parseInt(liveVideoResponse.data.data.id);

        if (liveVideoId) {
            const response = await axios.post(`${MFOX_BASE_API_URL}/live-video/end-live/${liveVideoId}`, {}, {headers: headers});
            return response.data;
        } else {
            console.error('Live video not found for stream key:', streamKey);
            return null;
        }
    } catch (error) {
        console.error('Error validating stream key:', error);
    }
}

module.exports = {
    endLiveByStreamKey,
};
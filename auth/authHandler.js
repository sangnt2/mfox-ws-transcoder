const axios = require('axios');

require('dotenv').config();

const MFOX_BASE_API_URL = process.env.MFOX_BASE_API_URL;

async function validateUserInMetaFox(msgData) {
    if (msgData && msgData.method === '__oauthLogin') {
        const params = msgData.params;
        const bearerToken = params[0];

        // request to MetaFox API to get user information by bearer token
        try {
            const response = await axios.get(MFOX_BASE_API_URL+'/me', {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`
                }
            });

            return {
                status: response.status,
                data: response.data,
                bearerToken: bearerToken
            }
        } catch (error) {
            console.error('Error fetching user data from MetaFox API:', error);
        }
    }
}

async function validateUserStreamKey(streamKey, bearerToken) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`
    };

    try {
        const response = await axios.post(MFOX_BASE_API_URL+'/live-video/validate-stream-key', {stream_key: streamKey}, {headers: headers});
        return response.data.status === 'success' && response.data.data;
    } catch (error) {
        console.error('Error validating stream key:', error);
    }
}

module.exports = {
    validateUserInMetaFox,
    validateUserStreamKey
};
const jwt = require('jsonwebtoken');

require('dotenv').config();

const secretKey = process.env.JWT_SECRET || 'your-secret-key';

function generateToken(payload, expiresIn = '8h') {
    return jwt.sign(payload, secretKey, { expiresIn });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, secretKey);
    } catch (err) {
        console.error('Token verification failed:', err);
        return null;
    }
}

module.exports = {
    generateToken,
    verifyToken
};
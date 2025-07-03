// Honeypot service for ClickGuard
const config = require('./config');

function checkHoneypot(trackingData) {
    if (!config.honeypotEnabled) return false;
    if (typeof trackingData.honeypot === 'string' && trackingData.honeypot.trim() !== '') {
        return true;
    }
    return false;
}

function generateChallenge(sessionId) {
    const challenge = Math.random().toString(36).substr(2, 12);
    const requiredPrefix = config.powPrefixChar.repeat(config.powDifficulty);
    return {
        challenge,
        sessionId,
        requiredPrefix
    };
}

module.exports = {
    checkHoneypot,
    generateChallenge
}; 
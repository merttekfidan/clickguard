// Proof-of-Work service for ClickGuard
const config = require('./config');
const crypto = require('crypto');

function verifyProofOfWork(pow, sessionId) {
    if (!config.proofOfWorkEnabled) return true;
    if (!pow || !pow.nonce || !pow.challenge || !pow.requiredPrefix) return false;
    const test = pow.challenge + sessionId + pow.nonce;
    const hash = crypto.createHash('sha256').update(test).digest('hex');
    return hash.startsWith(pow.requiredPrefix);
}

module.exports = {
    verifyProofOfWork
}; 
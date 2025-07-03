// Tracker module configuration

module.exports = {
    honeypotEnabled: true,
    proofOfWorkEnabled: true,
    powDifficulty: process.env.CG_POW_DIFFICULTY || 4, // Number of leading zeros (e.g., 4 = '0000')
    powPrefixChar: '0'
}; 
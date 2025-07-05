const express = require('express');
const passport = require('passport');
const authController = require('./auth.controller');

const router = express.Router();

// Test endpoint to verify auth module is working
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Auth module is working!',
        endpoints: {
            google: '/api/v1/auth/google',
            callback: '/api/v1/auth/google/callback',
            logout: '/api/v1/auth/logout',
            me: '/api/v1/auth/me'
        }
    });
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/google/callback', 
    passport.authenticate('google', { session: false }),
    authController.handleGoogleCallback
);

// Logout route
router.get('/logout', authController.logout);

// Get current user info
router.get('/me', authController.getCurrentUser);

module.exports = router; 
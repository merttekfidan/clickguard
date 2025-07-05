const express = require('express');
const passport = require('passport');
const authController = require('./auth.controller');

const router = express.Router();

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
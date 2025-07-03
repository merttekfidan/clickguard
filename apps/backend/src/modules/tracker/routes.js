const express = require('express');
const router = express.Router();
const path = require('path');
const controller = require('./controller');
const adminRoutes = require('./admin.routes');

// POST /api/v1/tracker - Handle tracking data from client script
router.post('/', controller.handleTrackingData);

// GET /api/v1/tracker/stats - Get tracking statistics (basic in-memory stats)
router.get('/stats', controller.getTrackingStats);

// GET /api/v1/tracker/clicks - Get recent click details
router.get('/clicks', controller.getRecentClicks);

// GET /api/v1/tracker/clicks/:clickId - Get specific click details
router.get('/clicks/:clickId', controller.getClickDetails);

// GET /api/v1/tracker/google-ads-stats - Get Google Ads statistics
router.get('/google-ads-stats', controller.getGoogleAdsStats);

// GET /api/v1/tracker/script - Serve the tracking script with CORS headers
router.get('/script', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'clickguard-tracker.js'));
});

// GET /api/v1/tracker/test - Serve the test page
router.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-tracker.html'));
});

// GET /api/v1/tracker/processed-clicks - Get processed click logs (debug)
router.get('/processed-clicks', controller.getProcessedClicks);

// Admin dashboard routes
router.use('/admin', adminRoutes);

module.exports = router; 
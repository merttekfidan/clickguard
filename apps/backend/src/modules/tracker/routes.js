const express = require('express');
const router = express.Router();
const path = require('path');
const controller = require('./controller');

// POST /api/v1/tracker - Handle tracking data from client script
router.post('/', controller.handleTrackingData);

// GET /api/v1/tracker/stats - Get tracking statistics (basic in-memory stats)
router.get('/stats', controller.getTrackingStats);

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

module.exports = router; 
const express = require('express');
const router = express.Router();
const trackerController = require('../controllers/tracker.controller');

// POST /api/v1/track - Track a click
router.post('/', trackerController.trackClick);

// GET /api/v1/track/health - Health check for tracker
router.get('/health', trackerController.healthCheck);

module.exports = router; 
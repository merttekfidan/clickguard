const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middleware/authenticate');

// Apply authentication middleware to all dashboard routes
router.use(authenticate);

// Dashboard overview
router.get('/overview', dashboardController.getOverview);

// Click logs
router.get('/clicks', dashboardController.getClickLogs);
router.get('/clicks/:id', dashboardController.getClickLog);

// Blocked IPs
router.get('/blocked-ips', dashboardController.getBlockedIPs);
router.post('/blocked-ips/:id/unblock', dashboardController.unblockIP);

// Connected accounts
router.get('/accounts', dashboardController.getConnectedAccounts);
router.get('/accounts/:id', dashboardController.getConnectedAccount);

// Settings
router.get('/settings', dashboardController.getSettings);
router.put('/settings', dashboardController.updateSettings);

module.exports = router; 
const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');

// Admin dashboard endpoints
router.get('/stats', adminController.getAdminStats);
router.get('/logs', adminController.getAdminLogs);
router.get('/domains', adminController.getDomainStats);
router.get('/domains/:domainId', adminController.getDomainDetails);
router.get('/bots', adminController.getBotStats);
router.get('/bots/ip/:ipAddress', adminController.getBotIPDetails);
router.get('/google-ads', adminController.getGoogleAdsStats);
router.get('/google-ads/campaigns', adminController.getGoogleAdsCampaigns);

module.exports = router; 
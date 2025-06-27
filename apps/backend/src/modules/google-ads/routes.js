const express = require('express');
const router = express.Router();
const GoogleAdsService = require('./service');
const authRoutes = require('./auth/routes');

// Mount auth submodule
router.use('/auth', authRoutes);

// GET /api/v1/google-ads/status
// Get Google Ads authentication status
router.get('/status', (req, res) => {
  try {
    const googleAdsService = new GoogleAdsService();
    const authStatus = googleAdsService.getAuthStatus();
    
    res.json({
      success: true,
      status: authStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting Google Ads status:', error.message);
    res.status(500).json({
      error: 'Failed to get Google Ads status',
      details: error.message
    });
  }
});

// POST /api/v1/google-ads/test-connection
// Test Google Ads connection
router.post('/test-connection', async (req, res) => {
  try {
    const googleAdsService = new GoogleAdsService();
    const result = await googleAdsService.testConnection();
    
    res.json({
      success: true,
      message: 'Google Ads connection test completed',
      result
    });
  } catch (error) {
    console.error('Error testing Google Ads connection:', error.message);
    res.status(500).json({
      error: 'Failed to test Google Ads connection',
      details: error.message
    });
  }
});

// GET /api/v1/google-ads/accounts
// Get available Google Ads accounts
router.get('/accounts', async (req, res) => {
  try {
    const googleAdsService = new GoogleAdsService();
    const accounts = await googleAdsService.getAvailableAccounts();
    
    res.json({
      success: true,
      accounts
    });
  } catch (error) {
    console.error('Error fetching Google Ads accounts:', error.message);
    res.status(500).json({
      error: 'Failed to fetch Google Ads accounts',
      details: error.message
    });
  }
});

// GET /api/v1/google-ads/account/:accountId/info
// Get account information from Google Ads
router.get('/account/:accountId/info', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    if (!accountId) {
      return res.status(400).json({
        error: 'Account ID is required'
      });
    }

    const googleAdsService = new GoogleAdsService();
    const accountInfo = await googleAdsService.getAccountInfo(accountId);

    res.json({
      success: true,
      accountInfo
    });
  } catch (error) {
    console.error('Error fetching account info:', error.message);
    res.status(500).json({
      error: 'Failed to fetch account info',
      details: error.message
    });
  }
});

module.exports = router; 
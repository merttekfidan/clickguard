const Joi = require('joi');
const { publishMessage, QUEUES } = require('../../services/queue.service');
const User = require('../../models/User');
const ConnectedAccount = require('../../models/ConnectedAccount');

// Validation schema for click tracking
const clickTrackingSchema = Joi.object({
  ipAddress: Joi.string().ip().required(),
  userAgent: Joi.string().max(500).optional(),
  keyword: Joi.string().max(200).optional(),
  gclid: Joi.string().max(100).optional(),
  campaignId: Joi.string().max(50).optional(),
  adGroupId: Joi.string().max(50).optional(),
  referrer: Joi.string().uri().optional(),
  landingPage: Joi.string().uri().optional(),
  timestamp: Joi.date().iso().optional()
});

const trackClick = async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validate API key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide X-API-Key header'
      });
    }

    // Find user by API key
    const user = await User.findByApiKey(apiKey);

    if (!user || !user.isActive || !['active', 'trial'].includes(user.subscriptionStatus)) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is invalid or account is inactive'
      });
    }

    // Validate request body
    const { error, value } = clickTrackingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message,
        details: error.details
      });
    }

    // Get user's connected accounts
    const connectedAccounts = await ConnectedAccount.findAll({
      where: { userId: user.id, isActive: true }
    });

    if (connectedAccounts.length === 0) {
      return res.status(400).json({
        error: 'No connected accounts',
        message: 'Please connect a Google Ads account before tracking clicks'
      });
    }

    // For now, use the first connected account
    // In the future, you might want to determine which account based on campaign/ad group
    const accountId = connectedAccounts[0].id;

    // Prepare click data
    const clickData = {
      accountId,
      userId: user.id,
      ipAddress: value.ipAddress,
      userAgent: value.userAgent,
      keyword: value.keyword,
      gclid: value.gclid,
      campaignId: value.campaignId,
      adGroupId: value.adGroupId,
      referrer: value.referrer,
      landingPage: value.landingPage,
      timestamp: value.timestamp || new Date().toISOString(),
      receivedAt: new Date().toISOString()
    };

    // Publish to queue
    await publishMessage(QUEUES.CLICK_PROCESSING, clickData);

    const processingTime = Date.now() - startTime;

    // Return immediate response
    res.status(202).json({
      success: true,
      message: 'Click queued for processing',
      data: {
        ipAddress: value.ipAddress,
        accountId,
        queuedAt: new Date().toISOString(),
        processingTime
      }
    });

    console.log(`📥 Click queued for IP ${value.ipAddress} - Processing time: ${processingTime}ms`);

  } catch (error) {
    console.error('❌ Error in trackClick:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process click tracking request'
    });
  }
};

const healthCheck = async (req, res) => {
  try {
    res.status(200).json({
      status: 'OK',
      service: 'ClickGuard Tracker',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('❌ Tracker health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      service: 'ClickGuard Tracker',
      error: error.message
    });
  }
};

module.exports = {
  trackClick,
  healthCheck
}; 
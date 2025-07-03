const ruleEngine = require('../services/ruleEngine.service');
const GoogleAdsService = require('../modules/google-ads/service');
const crypto = require('crypto');

// In-memory log for demonstration
const processedClicks = [];

// Device fingerprint counting (moved from analysis.service.js)
const fingerprintCounts = {};

function getDeviceFingerprint(rawData) {
    // Combine key signals for fingerprinting
    const str = [
        rawData.userAgent,
        rawData.language,
        rawData.timezone,
        rawData.screenResolution && rawData.screenResolution.width,
        rawData.screenResolution && rawData.screenResolution.height,
        rawData.canvasFingerprint
    ].join('|');
    return crypto.createHash('sha256').update(str).digest('hex');
}

function getFingerprintCount(deviceFingerprint) {
    if (!deviceFingerprint) return 0;
    
    // Count recent clicks with this fingerprint in the last 5 minutes
    const recentClicks = (global.recentClicks || []).filter(click =>
        click.deviceFingerprint === deviceFingerprint &&
        Date.now() - new Date(click.timestamp).getTime() < 5 * 60 * 1000
    );
    
    return recentClicks.length;
}

/**
 * Process a click: enrich, evaluate, block if needed, log
 * @param {object} clickData
 * @param {string} customerId
 * @param {string} campaignId
 */
const processClick = async (clickData, customerId, campaignId) => {
  // Note: ipInfo is already enriched in analysis.service.js via ip-api.com
  // We just need to evaluate rules and handle blocking
  
  // Generate device fingerprint if not present
  if (!clickData.deviceFingerprint) {
    clickData.deviceFingerprint = getDeviceFingerprint(clickData);
  }
  
  // 1. Update global recentClicks FIRST for accurate fingerprint counting
  global.recentClicks = global.recentClicks || [];
  global.recentClicks.unshift({
    ...clickData,
    timestamp: new Date().toISOString()
  });
  if (global.recentClicks.length > 100) global.recentClicks.pop();
  
  // 2. Calculate fingerprint count AFTER adding to recentClicks
  const fingerprintCount = getFingerprintCount(clickData.deviceFingerprint);
  
  // Debug logging for attack detection
  console.log('🔍 FINGERPRINT ANALYSIS:', {
    deviceFingerprint: clickData.deviceFingerprint?.slice(0, 8),
    fingerprintCount,
    ipAddress: clickData.ipAddress,
    sessionId: clickData.sessionId,
    isGoogleAds: clickData.gclid || clickData.utm_source,
    timestamp: new Date().toISOString()
  });
  
  // 3. Evaluate rules (ipInfo should already be in clickData from analysis.service.js)
  const contextData = {
    subnet: clickData.ipAddress ? clickData.ipAddress.split('.').slice(0, 2).join('.') + '.0.0/16' : null,
    fingerprintCount: fingerprintCount
  };
  const result = ruleEngine.runRules(clickData, contextData);

  // 4. If block, call Google Ads service
  let blockResult = null;
  if (result.decision === 'BLOCK') {
    const googleAdsService = new GoogleAdsService();
    blockResult = await googleAdsService.blockIpEntry(customerId, campaignId, result.target);
  }

  // 5. Log all steps
  const logEntry = {
    timestamp: new Date().toISOString(),
    click: clickData,
    decision: result,
    blockResult
  };
  processedClicks.unshift(logEntry);
  
  return logEntry;
};

module.exports = { processClick, processedClicks }; 
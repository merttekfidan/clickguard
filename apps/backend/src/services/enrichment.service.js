const fetch = require('node-fetch');
const crypto = require('crypto');

const enrichmentService = {
  /**
   * Enrich raw click data with IP info and device fingerprint
   * @param {object} rawData
   * @param {string} clientIP
   * @returns {Promise<object>} enrichedData
   */
  async enrich(rawData, clientIP) {
    // Enrich IP info (mocked, replace with real IP API call)
    let ipInfo = {};
    try {
      // Example: fetch from ip-api.com
      console.log('🌐 Fetching IP info for:', clientIP);
      const resp = await fetch(`http://ip-api.com/json/${clientIP}`);
      console.log('🌐 Response status:', resp.status);
      ipInfo = await resp.json();
      //console.log('🌐 Raw IP info:', ipInfo);
    } catch (e) {
      console.error('❌ IP API Error:', e.message);
      ipInfo = { status: 'fail', message: e.message };
    }
    // Do NOT set fallback values for ISP/org; return raw ipInfo
    // Device fingerprint (mocked, replace with real logic)
    const str = [
      rawData.userAgent,
      rawData.language,
      rawData.timezone,
      rawData.screenResolution && rawData.screenResolution.width,
      rawData.screenResolution && rawData.screenResolution.height,
      rawData.canvasFingerprint
    ].join('|');
    const deviceFingerprint = crypto.createHash('sha256').update(str).digest('hex');
    return {
      ...rawData,
      ipAddress: clientIP,
      ipInfo,
      deviceFingerprint
    };
  }
};

module.exports = enrichmentService; 
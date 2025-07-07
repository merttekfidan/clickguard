const ruleEngine = require('./ruleEngine.service');

const logBuilder = {
  /**
   * Build a ClickLog object from enriched data and rule result
   * @param {object} data
   * @returns {object} logObject
   */
  build(data) {
    // TypeScript-style shape for clarity
    /**
     * interface ClickLog {
     *   timestamp: Date;
     *   sessionId: string;
     *   ipAddress: string;
     *   deviceFingerprint: string;
     *   isGoogleAds: boolean;
     *   decision: 'BLOCK' | 'ALLOW';
     *   reason: string;
     *   ...
     * }
     */
    return {
      timestamp: new Date(),
      sessionId: data.sessionId,
      ipAddress: data.ipAddress,
      deviceFingerprint: data.deviceFingerprint,
      fingerprintCount: data.fingerprintCount,
      isGoogleAds: ruleEngine.isGoogleAdsClick(data),
      decision: data.decision,
      reason: data.reason,
      block_type: data.block_type || data.blockType || null,
      blocked_entry: data.blocked_entry || data.target || null,
      honeypot: data.honeypot,
      pow: data.pow,
      method: data.method,
      url: data.url,
      query: data.query,
      gclid: data.gclid,
      gclsrc: data.gclsrc,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
      utm_term: data.utm_term,
      utm_content: data.utm_content,
      referrer: data.referrer,
      domain: data.domain,
      ipInfo: data.ipInfo
    };
  }
};

module.exports = logBuilder; 
const axios = require('axios');

class IPReputationService {
  constructor() {
    this.apiKey = process.env.IP_REPUTATION_API_KEY;
    this.baseUrl = 'https://ipqualityscore.com/api/json/ip';
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour
  }

  async checkIPReputation(ipAddress) {
    try {
      // Check cache first
      const cached = this.getFromCache(ipAddress);
      if (cached) {
        console.log(`📋 IP reputation cache hit for ${ipAddress}`);
        return cached;
      }

      console.log(`🔍 Checking IP reputation for ${ipAddress}`);

      const response = await axios.get(this.baseUrl, {
        params: {
          key: this.apiKey,
          ip: ipAddress,
          allow_public_access_points: 'true',
          mobile: 'true',
          strictness: '1'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data.success === false) {
        throw new Error(`IP reputation API error: ${response.data.message}`);
      }

      const reputationData = {
        ip: ipAddress,
        isVpn: response.data.vpn || false,
        isProxy: response.data.proxy || false,
        isHosting: response.data.hosting || false,
        isTor: response.data.tor || false,
        country: response.data.country_code || null,
        city: response.data.city || null,
        region: response.data.region || null,
        isp: response.data.ISP || null,
        organization: response.data.organization || null,
        fraudScore: response.data.fraud_score || 0,
        riskLevel: response.data.risk_level || 'low',
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this.setCache(ipAddress, reputationData);

      console.log(`✅ IP reputation check completed for ${ipAddress}`);
      return reputationData;

    } catch (error) {
      console.error(`❌ IP reputation check failed for ${ipAddress}:`, error.message);
      
      // Return default data on error
      return {
        ip: ipAddress,
        isVpn: false,
        isProxy: false,
        isHosting: false,
        isTor: false,
        country: null,
        city: null,
        region: null,
        isp: null,
        organization: null,
        fraudScore: 0,
        riskLevel: 'unknown',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  getFromCache(ipAddress) {
    const cached = this.cache.get(ipAddress);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.cache.delete(ipAddress);
    }
    
    return null;
  }

  setCache(ipAddress, data) {
    this.cache.set(ipAddress, {
      data,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    this.cleanupCache();
  }

  cleanupCache() {
    const now = Date.now();
    for (const [ip, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTimeout) {
        this.cache.delete(ip);
      }
    }
  }

  async batchCheckIPs(ipAddresses) {
    const results = [];
    
    // Process in batches of 10 to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < ipAddresses.length; i += batchSize) {
      const batch = ipAddresses.slice(i, i + batchSize);
      const batchPromises = batch.map(ip => this.checkIPReputation(ip));
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      ));

      // Small delay between batches
      if (i + batchSize < ipAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  getFraudScore(ipAddress) {
    const cached = this.getFromCache(ipAddress);
    return cached ? cached.fraudScore : 0;
  }

  isSuspicious(ipAddress, threshold = 70) {
    const cached = this.getFromCache(ipAddress);
    if (!cached) return false;

    return (
      cached.fraudScore >= threshold ||
      cached.isVpn ||
      cached.isProxy ||
      cached.isTor ||
      cached.isHosting
    );
  }
}

module.exports = new IPReputationService(); 
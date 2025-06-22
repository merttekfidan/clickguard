const ClickLog = require('../models/ClickLog');
const BlockedIP = require('../models/BlockedIP');

class RuleEngineService {
  constructor() {
    this.rules = [
      this.vpnProxyRule,
      this.highFraudScoreRule,
      this.repeatedClicksRule,
      this.geographicAnomalyRule,
      this.userAgentRule,
      this.torNetworkRule
    ];
  }

  async analyzeClick(clickData, accountSettings = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Analyzing click for IP: ${clickData.ipAddress}`);

      // Get account settings with defaults
      const settings = {
        autoBlock: true,
        fraudScoreThreshold: 70,
        ...accountSettings
      };

      // Apply all rules
      const ruleResults = [];
      for (const rule of this.rules) {
        const result = await rule(clickData, settings);
        if (result) {
          ruleResults.push(result);
        }
      }

      // Calculate overall fraud score
      const fraudScore = this.calculateFraudScore(ruleResults, clickData);
      
      // Determine action based on results
      const decision = this.makeDecision(ruleResults, fraudScore, settings);

      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Click analysis completed for ${clickData.ipAddress} - Score: ${fraudScore}, Action: ${decision.action}`);

      return {
        fraudScore,
        decision,
        ruleResults,
        processingTime
      };

    } catch (error) {
      console.error(`❌ Error analyzing click for ${clickData.ipAddress}:`, error);
      return {
        fraudScore: 0,
        decision: {
          action: 'MONITOR',
          reason: 'Analysis failed',
          priority: 'LOW'
        },
        ruleResults: [],
        processingTime: Date.now() - startTime
      };
    }
  }

  // Rule: VPN/Proxy Detection
  async vpnProxyRule(clickData, settings) {
    if (clickData.isVpn || clickData.isProxy) {
      return {
        rule: 'VPN_PROXY_DETECTION',
        score: 85,
        reason: `Suspicious network detected: ${clickData.isVpn ? 'VPN' : ''}${clickData.isVpn && clickData.isProxy ? ' and ' : ''}${clickData.isProxy ? 'Proxy' : ''}`,
        priority: 'HIGH'
      };
    }
    return null;
  }

  // Rule: High Fraud Score
  async highFraudScoreRule(clickData, settings) {
    const threshold = settings.fraudScoreThreshold || 70;
    if (clickData.fraudScore >= threshold) {
      return {
        rule: 'HIGH_FRAUD_SCORE',
        score: Math.min(clickData.fraudScore, 95),
        reason: `High fraud score: ${clickData.fraudScore} (threshold: ${threshold})`,
        priority: 'HIGH'
      };
    }
    return null;
  }

  // Rule: Repeated Clicks from Same IP
  async repeatedClicksRule(clickData, settings) {
    try {
      const timeWindow = 60 * 60 * 1000; // 1 hour
      const recentClicks = await ClickLog.count({
        where: {
          accountId: clickData.accountId,
          ipAddress: clickData.ipAddress,
          timestamp: {
            [require('sequelize').Op.gte]: new Date(Date.now() - timeWindow)
          }
        }
      });

      if (recentClicks > 5) {
        return {
          rule: 'REPEATED_CLICKS',
          score: Math.min(recentClicks * 15, 90),
          reason: `Multiple clicks from same IP: ${recentClicks} clicks in the last hour`,
          priority: 'MEDIUM'
        };
      }
    } catch (error) {
      console.error('Error checking repeated clicks:', error);
    }
    return null;
  }

  // Rule: Geographic Anomaly
  async geographicAnomalyRule(clickData, settings) {
    if (!clickData.country) return null;

    try {
      // Check if this IP is from a different country than usual for this account
      const recentClicks = await ClickLog.findAll({
        where: {
          accountId: clickData.accountId,
          timestamp: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        attributes: ['country'],
        limit: 100
      });

      const countryCounts = {};
      recentClicks.forEach(click => {
        if (click.country) {
          countryCounts[click.country] = (countryCounts[click.country] || 0) + 1;
        }
      });

      const totalClicks = recentClicks.length;
      const currentCountryCount = countryCounts[clickData.country] || 0;
      const countryPercentage = totalClicks > 0 ? (currentCountryCount / totalClicks) * 100 : 0;

      // If this country represents less than 5% of recent clicks, it's suspicious
      if (totalClicks > 10 && countryPercentage < 5) {
        return {
          rule: 'GEOGRAPHIC_ANOMALY',
          score: 75,
          reason: `Unusual geographic location: ${clickData.country} (${countryPercentage.toFixed(1)}% of recent clicks)`,
          priority: 'MEDIUM'
        };
      }
    } catch (error) {
      console.error('Error checking geographic anomaly:', error);
    }
    return null;
  }

  // Rule: Suspicious User Agent
  async userAgentRule(clickData, settings) {
    if (!clickData.userAgent) return null;

    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /headless/i,
      /phantomjs/i,
      /selenium/i,
      /automation/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(clickData.userAgent));
    
    if (isSuspicious) {
      return {
        rule: 'SUSPICIOUS_USER_AGENT',
        score: 80,
        reason: 'Suspicious user agent detected',
        priority: 'HIGH'
      };
    }
    return null;
  }

  // Rule: TOR Network
  async torNetworkRule(clickData, settings) {
    if (clickData.isTor) {
      return {
        rule: 'TOR_NETWORK',
        score: 90,
        reason: 'TOR network detected',
        priority: 'HIGH'
      };
    }
    return null;
  }

  calculateFraudScore(ruleResults, clickData) {
    if (ruleResults.length === 0) {
      return clickData.fraudScore || 0;
    }

    // Calculate weighted average of rule scores
    let totalScore = clickData.fraudScore || 0;
    let totalWeight = 1;

    ruleResults.forEach(result => {
      const weight = this.getRuleWeight(result.priority);
      totalScore += result.score * weight;
      totalWeight += weight;
    });

    return Math.min(Math.round(totalScore / totalWeight), 100);
  }

  getRuleWeight(priority) {
    switch (priority) {
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 1;
    }
  }

  makeDecision(ruleResults, fraudScore, settings) {
    // Check if any high-priority rules were triggered
    const highPriorityRules = ruleResults.filter(r => r.priority === 'HIGH');
    
    if (highPriorityRules.length > 0 && settings.autoBlock) {
      const reasons = highPriorityRules.map(r => r.reason).join('; ');
      return {
        action: 'BLOCK_IP',
        reason: reasons,
        priority: 'HIGH'
      };
    }

    // Check fraud score threshold
    if (fraudScore >= (settings.fraudScoreThreshold || 70) && settings.autoBlock) {
      return {
        action: 'BLOCK_IP',
        reason: `Fraud score ${fraudScore} exceeds threshold`,
        priority: 'HIGH'
      };
    }

    // Medium priority rules
    const mediumPriorityRules = ruleResults.filter(r => r.priority === 'MEDIUM');
    if (mediumPriorityRules.length > 0) {
      const reasons = mediumPriorityRules.map(r => r.reason).join('; ');
      return {
        action: 'MONITOR',
        reason: reasons,
        priority: 'MEDIUM'
      };
    }

    // Default: monitor
    return {
      action: 'MONITOR',
      reason: 'No suspicious activity detected',
      priority: 'LOW'
    };
  }

  async isIPAlreadyBlocked(ipAddress, accountId) {
    try {
      const blockedIP = await BlockedIP.findOne({
        where: {
          accountId,
          ipAddress,
          isActive: true
        }
      });
      return !!blockedIP;
    } catch (error) {
      console.error('Error checking if IP is blocked:', error);
      return false;
    }
  }
}

module.exports = new RuleEngineService(); 
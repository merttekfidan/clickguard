const { consumeMessages, QUEUES } = require('../services/queue.service');
const { publishMessage } = require('../services/queue.service');
const ipReputationService = require('../services/ipReputation.service');
const ruleEngineService = require('../services/ruleEngine.service');
const ClickLog = require('../models/ClickLog');
const ConnectedAccount = require('../models/ConnectedAccount');
const BlockedIP = require('../models/BlockedIP');

class ClickProcessorWorker {
  constructor() {
    this.isRunning = false;
    this.consumer = null;
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Click processor worker is already running');
      return;
    }

    try {
      console.log('🚀 Starting click processor worker...');
      
      this.isRunning = true;
      
      // Start consuming messages from the click processing queue
      this.consumer = await consumeMessages(
        QUEUES.CLICK_PROCESSING,
        this.processClick.bind(this)
      );

      console.log('✅ Click processor worker started successfully');
    } catch (error) {
      console.error('❌ Failed to start click processor worker:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      console.log('⚠️ Click processor worker is not running');
      return;
    }

    try {
      console.log('🛑 Stopping click processor worker...');
      
      this.isRunning = false;
      
      if (this.consumer) {
        // Cancel the consumer
        await this.consumer.cancel();
        this.consumer = null;
      }

      console.log('✅ Click processor worker stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping click processor worker:', error);
      throw error;
    }
  }

  async processClick(clickData) {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Processing click for IP: ${clickData.ipAddress}`);

      // Step 1: Validate and enrich click data
      const enrichedData = await this.enrichClickData(clickData);
      
      // Step 2: Run fraud detection rules
      const analysisResult = await ruleEngineService.analyzeClick(enrichedData, enrichedData.accountSettings);
      
      // Step 3: Save click log to database
      const clickLog = await this.saveClickLog(enrichedData, analysisResult);
      
      // Step 4: Handle action based on decision
      await this.handleAction(clickData, analysisResult, clickLog);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Click processed successfully in ${processingTime}ms - IP: ${clickData.ipAddress}, Score: ${analysisResult.fraudScore}, Action: ${analysisResult.decision.action}`);

    } catch (error) {
      console.error(`❌ Error processing click for ${clickData.ipAddress}:`, error);
      
      // Log the error but don't fail the entire process
      try {
        await this.saveErrorLog(clickData, error);
      } catch (logError) {
        console.error('❌ Failed to save error log:', logError);
      }
    }
  }

  async enrichClickData(clickData) {
    try {
      // Get account information
      const connectedAccount = await ConnectedAccount.findOne({
        where: { 
          id: clickData.accountId,
          isActive: true 
        }
      });

      if (!connectedAccount) {
        throw new Error(`Connected account not found: ${clickData.accountId}`);
      }

      // Get IP reputation data
      const reputationData = await ipReputationService.checkIPReputation(clickData.ipAddress);

      // Merge all data
      const enrichedData = {
        ...clickData,
        ...reputationData,
        accountSettings: connectedAccount.settings,
        userId: connectedAccount.userId,
        googleAdsAccountId: connectedAccount.googleAdsAccountId
      };

      return enrichedData;
    } catch (error) {
      console.error('Error enriching click data:', error);
      throw error;
    }
  }

  async saveClickLog(enrichedData, analysisResult) {
    try {
      const clickLog = await ClickLog.create({
        accountId: enrichedData.accountId,
        ipAddress: enrichedData.ipAddress,
        userAgent: enrichedData.userAgent,
        keyword: enrichedData.keyword,
        gclid: enrichedData.gclid,
        campaignId: enrichedData.campaignId,
        adGroupId: enrichedData.adGroupId,
        isVpn: enrichedData.isVpn,
        isProxy: enrichedData.isProxy,
        isHosting: enrichedData.isHosting,
        isTor: enrichedData.isTor,
        country: enrichedData.country,
        city: enrichedData.city,
        region: enrichedData.region,
        fraudScore: analysisResult.fraudScore,
        decision: analysisResult.decision,
        ipReputationData: {
          isp: enrichedData.isp,
          organization: enrichedData.organization,
          riskLevel: enrichedData.riskLevel
        },
        processingTime: analysisResult.processingTime,
        timestamp: new Date()
      });

      return clickLog;
    } catch (error) {
      console.error('Error saving click log:', error);
      throw error;
    }
  }

  async handleAction(originalClickData, analysisResult, clickLog) {
    try {
      const { decision } = analysisResult;
      
      if (decision.action === 'BLOCK_IP') {
        // Check if IP is already blocked
        const isAlreadyBlocked = await ruleEngineService.isIPAlreadyBlocked(
          originalClickData.ipAddress,
          originalClickData.accountId
        );

        if (!isAlreadyBlocked) {
          // Publish message to Google Ads actions queue
          const actionMessage = {
            accountId: originalClickData.accountId,
            ipAddress: originalClickData.ipAddress,
            reason: decision.reason,
            fraudScore: analysisResult.fraudScore,
            clickLogId: clickLog.id,
            timestamp: new Date().toISOString()
          };

          await publishMessage(QUEUES.GOOGLE_ADS_ACTIONS, actionMessage);
          console.log(`📤 IP blocking action queued for ${originalClickData.ipAddress}`);
        } else {
          console.log(`ℹ️ IP ${originalClickData.ipAddress} is already blocked`);
        }
      }

      // Update blocked IP record if action is BLOCK_IP
      if (decision.action === 'BLOCK_IP') {
        await this.updateBlockedIPRecord(originalClickData, analysisResult);
      }

    } catch (error) {
      console.error('Error handling action:', error);
      throw error;
    }
  }

  async updateBlockedIPRecord(clickData, analysisResult) {
    try {
      const [blockedIP, created] = await BlockedIP.findOrCreate({
        where: {
          accountId: clickData.accountId,
          ipAddress: clickData.ipAddress
        },
        defaults: {
          reason: analysisResult.decision.reason,
          fraudScore: analysisResult.fraudScore,
          blockSource: 'AUTO',
          isActive: true,
          metadata: {
            ruleResults: analysisResult.ruleResults,
            processingTime: analysisResult.processingTime
          }
        }
      });

      if (!created) {
        // Update existing record
        await blockedIP.update({
          reason: analysisResult.decision.reason,
          fraudScore: analysisResult.fraudScore,
          lastSeenAt: new Date(),
          clickCount: blockedIP.clickCount + 1
        });
      }

      console.log(`📝 Blocked IP record ${created ? 'created' : 'updated'} for ${clickData.ipAddress}`);
    } catch (error) {
      console.error('Error updating blocked IP record:', error);
      throw error;
    }
  }

  async saveErrorLog(clickData, error) {
    try {
      await ClickLog.create({
        accountId: clickData.accountId,
        ipAddress: clickData.ipAddress,
        userAgent: clickData.userAgent,
        keyword: clickData.keyword,
        gclid: clickData.gclid,
        fraudScore: 0,
        decision: {
          action: 'ERROR',
          reason: `Processing failed: ${error.message}`,
          priority: 'LOW'
        },
        timestamp: new Date()
      });
    } catch (logError) {
      console.error('Error saving error log:', logError);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      consumer: this.consumer ? 'active' : 'inactive'
    };
  }
}

module.exports = new ClickProcessorWorker(); 
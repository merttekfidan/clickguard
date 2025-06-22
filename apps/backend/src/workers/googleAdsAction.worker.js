const { consumeMessages, QUEUES } = require('../services/queue.service');
const googleAdsService = require('../services/googleAds.service');
const { emitIPBlocked, emitSystemAlert } = require('../services/websocket.service');
const ConnectedAccount = require('../models/ConnectedAccount');
const BlockedIP = require('../models/BlockedIP');
const ClickLog = require('../models/ClickLog');

class GoogleAdsActionWorker {
  constructor() {
    this.isRunning = false;
    this.consumer = null;
    this.retryDelays = [5000, 15000, 30000, 60000]; // Exponential backoff delays
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Google Ads action worker is already running');
      return;
    }

    try {
      console.log('🚀 Starting Google Ads action worker...');
      
      this.isRunning = true;
      
      // Start consuming messages from the Google Ads actions queue
      this.consumer = await consumeMessages(
        QUEUES.GOOGLE_ADS_ACTIONS,
        this.processAction.bind(this)
      );

      console.log('✅ Google Ads action worker started successfully');
    } catch (error) {
      console.error('❌ Failed to start Google Ads action worker:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      console.log('⚠️ Google Ads action worker is not running');
      return;
    }

    try {
      console.log('🛑 Stopping Google Ads action worker...');
      
      this.isRunning = false;
      
      if (this.consumer) {
        // Cancel the consumer
        await this.consumer.cancel();
        this.consumer = null;
      }

      console.log('✅ Google Ads action worker stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping Google Ads action worker:', error);
      throw error;
    }
  }

  async processAction(actionData) {
    const startTime = Date.now();
    
    try {
      console.log(`🔧 Processing Google Ads action for IP: ${actionData.ipAddress}`);

      // Validate action data
      this.validateActionData(actionData);

      // Get connected account information
      const connectedAccount = await ConnectedAccount.findOne({
        where: { 
          id: actionData.accountId,
          isActive: true 
        }
      });

      if (!connectedAccount) {
        throw new Error(`Connected account not found: ${actionData.accountId}`);
      }

      // Process the action with retry logic
      const result = await this.executeActionWithRetry(actionData, connectedAccount);

      // Update database records
      await this.updateRecords(actionData, result);

      // Send real-time notifications
      await this.sendNotifications(actionData, result, connectedAccount);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Google Ads action completed in ${processingTime}ms - IP: ${actionData.ipAddress}, Success: ${result.success}`);

    } catch (error) {
      console.error(`❌ Error processing Google Ads action for ${actionData.ipAddress}:`, error);
      
      // Send error notification
      await this.sendErrorNotification(actionData, error);
      
      // Re-throw to trigger message requeue
      throw error;
    }
  }

  validateActionData(actionData) {
    const requiredFields = ['accountId', 'ipAddress', 'reason'];
    const missingFields = requiredFields.filter(field => !actionData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate IP address format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(actionData.ipAddress)) {
      throw new Error(`Invalid IP address format: ${actionData.ipAddress}`);
    }
  }

  async executeActionWithRetry(actionData, connectedAccount) {
    let lastError;
    
    for (let attempt = 0; attempt < this.retryDelays.length; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1} to block IP ${actionData.ipAddress}`);
        
        const result = await googleAdsService.blockIP(
          actionData.accountId,
          actionData.ipAddress,
          actionData.reason
        );

        console.log(`✅ IP ${actionData.ipAddress} blocked successfully on attempt ${attempt + 1}`);
        return result;

      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt + 1} failed for IP ${actionData.ipAddress}:`, error.message);

        // If it's the last attempt, don't wait
        if (attempt < this.retryDelays.length - 1) {
          const delay = this.retryDelays[attempt];
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new Error(`Failed to block IP ${actionData.ipAddress} after ${this.retryDelays.length} attempts. Last error: ${lastError.message}`);
  }

  async updateRecords(actionData, result) {
    try {
      // Update blocked IP record
      const [blockedIP, created] = await BlockedIP.findOrCreate({
        where: {
          accountId: actionData.accountId,
          ipAddress: actionData.ipAddress
        },
        defaults: {
          reason: actionData.reason,
          fraudScore: actionData.fraudScore,
          blockSource: 'AUTO',
          isActive: true,
          metadata: {
            googleAdsOperationId: result.operationId,
            alreadyBlocked: result.alreadyBlocked || false,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (!created) {
        // Update existing record
        await blockedIP.update({
          reason: actionData.reason,
          fraudScore: actionData.fraudScore,
          lastSeenAt: new Date(),
          metadata: {
            ...blockedIP.metadata,
            googleAdsOperationId: result.operationId,
            lastBlockAttempt: new Date().toISOString()
          }
        });
      }

      // Update click log if clickLogId is provided
      if (actionData.clickLogId) {
        await ClickLog.update(
          {
            decision: {
              action: 'BLOCK_IP',
              reason: actionData.reason,
              priority: 'HIGH',
              googleAdsBlocked: true,
              googleAdsOperationId: result.operationId
            }
          },
          {
            where: { id: actionData.clickLogId }
          }
        );
      }

      console.log(`📝 Database records updated for IP ${actionData.ipAddress}`);
    } catch (error) {
      console.error('Error updating records:', error);
      throw error;
    }
  }

  async sendNotifications(actionData, result, connectedAccount) {
    try {
      // Send real-time notification to user
      emitIPBlocked(
        connectedAccount.userId,
        actionData.accountId,
        {
          ipAddress: actionData.ipAddress,
          reason: actionData.reason,
          fraudScore: actionData.fraudScore,
          operationId: result.operationId,
          alreadyBlocked: result.alreadyBlocked || false
        }
      );

      // Send system alert
      emitSystemAlert(
        connectedAccount.userId,
        actionData.accountId,
        {
          level: 'success',
          message: `IP ${actionData.ipAddress} has been blocked in Google Ads. Reason: ${actionData.reason}`
        }
      );

      console.log(`📡 Notifications sent for IP ${actionData.ipAddress}`);
    } catch (error) {
      console.error('Error sending notifications:', error);
      // Don't throw error here as it's not critical
    }
  }

  async sendErrorNotification(actionData, error) {
    try {
      const connectedAccount = await ConnectedAccount.findOne({
        where: { id: actionData.accountId }
      });

      if (connectedAccount) {
        emitSystemAlert(
          connectedAccount.userId,
          actionData.accountId,
          {
            level: 'error',
            message: `Failed to block IP ${actionData.ipAddress} in Google Ads. Error: ${error.message}`
          }
        );
      }
    } catch (notificationError) {
      console.error('Error sending error notification:', notificationError);
    }
  }

  async unblockIP(accountId, ipAddress) {
    try {
      console.log(`🔓 Unblocking IP ${ipAddress} for account ${accountId}`);

      const result = await googleAdsService.unblockIP(accountId, ipAddress);

      // Update blocked IP record
      await BlockedIP.update(
        {
          isActive: false,
          unblockTimestamp: new Date(),
          metadata: {
            ...BlockedIP.metadata,
            unblockOperationId: result.operationId,
            unblockedAt: new Date().toISOString()
          }
        },
        {
          where: {
            accountId,
            ipAddress,
            isActive: true
          }
        }
      );

      console.log(`✅ IP ${ipAddress} unblocked successfully`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to unblock IP ${ipAddress}:`, error);
      throw error;
    }
  }

  async getBlockedIPs(accountId) {
    try {
      const blockedIPs = await BlockedIP.findAll({
        where: {
          accountId,
          isActive: true
        },
        order: [['blockTimestamp', 'DESC']]
      });

      return blockedIPs;
    } catch (error) {
      console.error('Error getting blocked IPs:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      consumer: this.consumer ? 'active' : 'inactive',
      retryDelays: this.retryDelays
    };
  }
}

module.exports = new GoogleAdsActionWorker(); 
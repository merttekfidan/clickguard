const { GoogleAdsApi } = require('google-ads-api');
const ConnectedAccount = require('../models/ConnectedAccount');

class GoogleAdsService {
  constructor() {
    this.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  }

  async getClient(accountId) {
    try {
      // Get connected account
      const connectedAccount = await ConnectedAccount.findOne({
        where: { id: accountId, isActive: true }
      });

      if (!connectedAccount) {
        throw new Error('Connected account not found or inactive');
      }

      // Check if token is expired
      if (new Date() > connectedAccount.tokenExpiry) {
        await this.refreshToken(connectedAccount);
      }

      // Create Google Ads client
      const client = new GoogleAdsApi({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        developer_token: this.developerToken,
        refresh_token: connectedAccount.refreshToken
      });

      return client.getCustomer(connectedAccount.googleAdsAccountId);
    } catch (error) {
      console.error('Error creating Google Ads client:', error);
      throw error;
    }
  }

  async refreshToken(connectedAccount) {
    try {
      console.log('🔄 Refreshing Google Ads token for account:', connectedAccount.googleAdsAccountId);

      const client = new GoogleAdsApi({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        developer_token: this.developerToken,
        refresh_token: connectedAccount.refreshToken
      });

      const customer = client.getCustomer(connectedAccount.googleAdsAccountId);
      
      // The client will automatically refresh the token
      await customer.query('SELECT customer.id FROM customer LIMIT 1');

      // Update the account with new token info
      await connectedAccount.update({
        lastSyncAt: new Date()
      });

      console.log('✅ Google Ads token refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh Google Ads token:', error);
      throw error;
    }
  }

  async blockIP(accountId, ipAddress, reason) {
    try {
      console.log(`🚫 Blocking IP ${ipAddress} for account ${accountId}`);

      const customer = await this.getClient(accountId);

      // Create IP exclusion
      const ipExclusion = {
        ip_block: {
          ip_address: ipAddress
        }
      };

      // Add IP to exclusion list
      const result = await customer.ipBlockService.addIpBlock(ipExclusion);

      console.log(`✅ IP ${ipAddress} blocked successfully`);
      
      return {
        success: true,
        operationId: result.operation_id,
        ipAddress,
        reason
      };

    } catch (error) {
      console.error(`❌ Failed to block IP ${ipAddress}:`, error);
      
      // Check if IP is already blocked
      if (error.message.includes('already exists')) {
        console.log(`ℹ️ IP ${ipAddress} is already blocked`);
        return {
          success: true,
          alreadyBlocked: true,
          ipAddress,
          reason
        };
      }

      throw error;
    }
  }

  async unblockIP(accountId, ipAddress) {
    try {
      console.log(`🔓 Unblocking IP ${ipAddress} for account ${accountId}`);

      const customer = await this.getClient(accountId);

      // Remove IP from exclusion list
      const result = await customer.ipBlockService.removeIpBlock({
        ip_block: {
          ip_address: ipAddress
        }
      });

      console.log(`✅ IP ${ipAddress} unblocked successfully`);
      
      return {
        success: true,
        operationId: result.operation_id,
        ipAddress
      };

    } catch (error) {
      console.error(`❌ Failed to unblock IP ${ipAddress}:`, error);
      throw error;
    }
  }

  async getAccountInfo(accountId) {
    try {
      const customer = await this.getClient(accountId);

      const query = `
        SELECT 
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone,
          customer.manager,
          customer.test_account
        FROM customer
        LIMIT 1
      `;

      const response = await customer.query(query);
      const accountInfo = response[0];

      return {
        id: accountInfo.customer.id,
        name: accountInfo.customer.descriptive_name,
        currency: accountInfo.customer.currency_code,
        timezone: accountInfo.customer.time_zone,
        isManager: accountInfo.customer.manager,
        isTestAccount: accountInfo.customer.test_account
      };

    } catch (error) {
      console.error('Error getting account info:', error);
      throw error;
    }
  }

  async getCampaigns(accountId) {
    try {
      const customer = await this.getClient(accountId);

      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.start_date,
          campaign.end_date,
          campaign.budget_amount_micros
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        ORDER BY campaign.name
      `;

      const response = await customer.query(query);

      return response.map(campaign => ({
        id: campaign.campaign.id,
        name: campaign.campaign.name,
        status: campaign.campaign.status,
        type: campaign.campaign.advertising_channel_type,
        startDate: campaign.campaign.start_date,
        endDate: campaign.campaign.end_date,
        budget: campaign.campaign.budget_amount_micros / 1000000 // Convert from micros
      }));

    } catch (error) {
      console.error('Error getting campaigns:', error);
      throw error;
    }
  }

  async getAdGroups(accountId, campaignId = null) {
    try {
      const customer = await this.getClient(accountId);

      let query = `
        SELECT 
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.type,
          campaign.id,
          campaign.name
        FROM ad_group
        WHERE ad_group.status != 'REMOVED'
      `;

      if (campaignId) {
        query += ` AND campaign.id = ${campaignId}`;
      }

      query += ' ORDER BY ad_group.name';

      const response = await customer.query(query);

      return response.map(adGroup => ({
        id: adGroup.ad_group.id,
        name: adGroup.ad_group.name,
        status: adGroup.ad_group.status,
        type: adGroup.ad_group.type,
        campaignId: adGroup.campaign.id,
        campaignName: adGroup.campaign.name
      }));

    } catch (error) {
      console.error('Error getting ad groups:', error);
      throw error;
    }
  }

  async getBlockedIPs(accountId) {
    try {
      const customer = await this.getClient(accountId);

      const query = `
        SELECT 
          ip_block.ip_address,
          ip_block.add_time
        FROM ip_block
        ORDER BY ip_block.add_time DESC
      `;

      const response = await customer.query(query);

      return response.map(ipBlock => ({
        ipAddress: ipBlock.ip_block.ip_address,
        blockedAt: ipBlock.ip_block.add_time
      }));

    } catch (error) {
      console.error('Error getting blocked IPs:', error);
      throw error;
    }
  }

  async testConnection(accountId) {
    try {
      const customer = await this.getClient(accountId);
      
      // Simple query to test connection
      await customer.query('SELECT customer.id FROM customer LIMIT 1');
      
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      console.error('Google Ads connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new GoogleAdsService(); 
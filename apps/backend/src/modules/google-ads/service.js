const googleAdsApi = require('./api');
const googleAdsAuthService = require('./auth/service');

const MCC_CUSTOMER_ID = process.env.GOOGLE_ADS_MCC_ID;

class GoogleAdsService {
  constructor() {
    this.mccCustomerId = MCC_CUSTOMER_ID;
  }

  /**
   * Initialize the service with authentication
   */
  async initialize() {
    return await googleAdsAuthService.initialize();
  }

  /**
   * Get authentication status
   */
  getAuthStatus() {
    return googleAdsAuthService.getAuthStatus();
  }

  // Test connection to Google Ads API
  async testConnection() {
    try {
      const refreshToken = googleAdsAuthService.getRefreshToken();
      const query = `
        SELECT
          customer.id,
          customer.descriptive_name
        FROM customer
        LIMIT 1
      `;

      const response = await googleAdsApi.runQuery({
        customerId: this.mccCustomerId,
        refreshToken: refreshToken,
        loginCustomerId: this.mccCustomerId,
        query,
      });

      if (response && response.length > 0) {
        return {
          success: true,
          message: 'Connection successful',
          account: response[0].customer,
        };
      }

      throw new Error('No accounts found');
    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      return {
        success: false,
        message: 'Connection failed',
        error: error.message,
      };
    }
  }

  // Get available accounts
  async getAvailableAccounts() {
    try {
      const refreshToken = googleAdsAuthService.getRefreshToken();
      
      if (!refreshToken) {
        console.log('⚠️  No refresh token available for Google Ads API');
        return [];
      }
      
      const query = `
        SELECT
          customer_client.id,
          customer_client.descriptive_name,
          customer_client.manager,
          customer_client.test_account
        FROM customer_client
        ORDER BY customer_client.descriptive_name
      `;

      const response = await googleAdsApi.runQuery({
        customerId: this.mccCustomerId,
        refreshToken: refreshToken,
        loginCustomerId: this.mccCustomerId,
        query,
      });

      if (response && response.length > 0) {
        return response.map(client => ({
          id: client.customerClient.id,
          name: client.customerClient.descriptiveName,
          isManager: client.customerClient.manager,
          isTestAccount: client.customerClient.testAccount,
        }));
      }

      return [];
    } catch (error) {
      console.error('❌ Failed to get available accounts:', error.message);
      
      // Don't throw the error, just return empty array
      // This prevents the gRPC error from crashing the server
      return [];
    }
  }

  // Get account information
  async getAccountInfo(clientAdsId) {
    try {
      const refreshToken = googleAdsAuthService.getRefreshToken();
      
      if (!refreshToken) {
        console.log('⚠️  No refresh token available for Google Ads API');
        throw new Error('No refresh token available');
      }
      
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

      const response = await googleAdsApi.runQuery({
        customerId: clientAdsId,
        refreshToken: refreshToken,
        loginCustomerId: this.mccCustomerId,
        query,
      });

      if (response && response.length > 0) {
        return response[0].customer;
      }

      throw new Error('Account not found');
    } catch (error) {
      console.error('❌ Failed to get account info:', error.message);
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  // Validate client account ID format
  static validateCustomerId(customerId) {
    // Remove dashes and validate format (10 digits)
    const cleanId = customerId.replace(/-/g, '');
    return /^\d{10}$/.test(cleanId);
  }

  // Format customer ID for display (XXX-XXX-XXXX)
  static formatCustomerId(customerId) {
    const cleanId = customerId.replace(/-/g, '');
    if (cleanId.length === 10) {
      return `${cleanId.slice(0, 3)}-${cleanId.slice(3, 6)}-${cleanId.slice(6)}`;
    }
    return customerId;
  }
}

module.exports = GoogleAdsService; 
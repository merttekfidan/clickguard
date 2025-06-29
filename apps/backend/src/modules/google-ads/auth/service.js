const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/adwords'];

class GoogleAdsAuthService {
  constructor() {
    this.credentials = this.loadCredentials();
    this.oauth2Client = this.createOAuth2Client();
    this.tokenPath = null; // No file-based token storage in production
  }

  loadCredentials() {
    // Load credentials from environment variables only
    return {
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      redirect_uris: (process.env.GOOGLE_ADS_REDIRECT_URIS || 'urn:ietf:wg:oauth:2.0:oob').split(',')
    };
  }

  createOAuth2Client() {
    const { client_id, client_secret, redirect_uris } = this.credentials;
    return new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris && redirect_uris.length > 0 ? redirect_uris[0] : 'urn:ietf:wg:oauth:2.0:oob'
    );
  }

  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
  }

  async getTokenFromCode(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    // In production, store tokens in a secure store or env, not in a file
    return tokens;
  }

  // No file-based token loading in production
  loadToken() {
    return null;
  }

  getRefreshToken() {
    return null;
  }

  getAuthStatus() {
    return {
      isAuthenticated: !!this.oauth2Client.credentials,
      hasRefreshToken: !!(this.oauth2Client.credentials && this.oauth2Client.credentials.refresh_token),
    };
  }

  async ensureAuthenticated() {
    if (!this.oauth2Client.credentials || !this.oauth2Client.credentials.refresh_token) {
      throw new Error('No refresh token found. Please authenticate using the OAuth2 flow.');
    }
    return this.oauth2Client.credentials;
  }

  getOAuth2Client() {
    return this.oauth2Client;
  }
}

module.exports = new GoogleAdsAuthService(); 
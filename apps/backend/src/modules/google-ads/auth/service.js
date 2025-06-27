const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CLIENT_SECRET_PATH = path.join(__dirname, 'client_secret.json');
const SCOPES = ['https://www.googleapis.com/auth/adwords'];

class GoogleAdsAuthService {
  constructor() {
    this.credentials = this.loadCredentials();
    this.oauth2Client = this.createOAuth2Client();
    this.tokenPath = path.join(__dirname, 'token.json');
  }

  loadCredentials() {
    try {
      const content = fs.readFileSync(CLIENT_SECRET_PATH, 'utf8');
      return JSON.parse(content).installed || JSON.parse(content).web;
    } catch (err) {
      throw new Error('Error loading client_secret.json: ' + err.message);
    }
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
    fs.writeFileSync(this.tokenPath, JSON.stringify(tokens));
    return tokens;
  }

  loadToken() {
    if (fs.existsSync(this.tokenPath)) {
      const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
      this.oauth2Client.setCredentials(token);
      return token;
    }
    return null;
  }

  getRefreshToken() {
    const token = this.loadToken();
    return token ? token.refresh_token : null;
  }

  getAuthStatus() {
    const token = this.loadToken();
    return {
      isAuthenticated: !!token,
      hasRefreshToken: !!(token && token.refresh_token),
    };
  }

  async ensureAuthenticated() {
    let token = this.loadToken();
    if (!token) {
      throw new Error('No refresh token found. Please authenticate using the OAuth2 flow.');
    }
    // Optionally, check if token is expired and refresh if needed
    return token;
  }

  getOAuth2Client() {
    return this.oauth2Client;
  }
}

module.exports = new GoogleAdsAuthService(); 
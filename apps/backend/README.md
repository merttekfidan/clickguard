# ClickGuard Backend

A robust Node.js backend server for ClickGuard, providing Google Ads API authentication, account management, and real-time click fraud detection services.

## 🚀 Features

- **Google Ads API Integration**: Full OAuth2 authentication and API access
- **Account Management**: Retrieve and manage Google Ads accounts
- **Real-time Monitoring**: Track account status and connection health
- **Security & Anti-Fraud**:
  - Partial-match allowlist for Polish ISPs/orgs (case-insensitive, substring match)
  - /16 subnet fraud tracking for broader abuse detection
  - Improved logging: colored output, only relevant IP/proxy info on block, no device details
- **Scalable Architecture**: Modular design with clear separation of concerns
- **Development Ready**: Hot reloading, comprehensive logging, and error handling

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Google Ads API Access** (Developer Token, OAuth2 credentials)
- **Google Cloud Console** project with Google Ads API enabled
- **All Google Ads credentials must be set via environment variables (see .env.example). Do not use client_secret.json.**

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ClickGuard/apps/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file:**
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:5173
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=24h
   
   # Google Ads API Configuration
   GOOGLE_ADS_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
   GOOGLE_ADS_CLIENT_SECRET=your-google-oauth-client-secret
   GOOGLE_ADS_DEVELOPER_TOKEN=your-google-ads-developer-token
   GOOGLE_ADS_MCC_ID=your-google-ads-mcc-id
   GOOGLE_ADS_REDIRECT_URIS=urn:ietf:wg:oauth:2.0:oob
   ```

## 🔧 Development

### Start Development Server
```bash
npm run dev
```

### Start Production Server
```bash
npm start
```

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

### Google Ads Status
```http
GET /api/v1/google-ads/status
```

**Response:**
```json
{
  "success": true,
  "status": {
    "isAuthenticated": true,
    "hasRefreshToken": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test Google Ads Connection
```http
POST /api/v1/google-ads/test-connection
```

**Response:**
```json
{
  "success": true,
  "message": "Google Ads connection test completed",
  "result": {
    "success": true,
    "message": "Connection successful",
    "account": {
      "id": "1234567890",
      "descriptiveName": "My Google Ads Account"
    }
  }
}
```

### Get Available Accounts
```http
GET /api/v1/google-ads/accounts
```

**Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "id": "1234567890",
      "name": "Account Name",
      "isManager": false,
      "isTestAccount": false
    }
  ]
}
```

### Get Account Information
```http
GET /api/v1/google-ads/account/{accountId}/info
```

**Response:**
```json
{
  "success": true,
  "accountInfo": {
    "id": "1234567890",
    "descriptiveName": "Account Name",
    "currencyCode": "USD",
    "timeZone": "America/New_York",
    "manager": false,
    "testAccount": false
  }
}
```

### Authentication Endpoints

#### Get OAuth URL
```http
GET /api/v1/google-ads/auth/url
```

**Response:**
```json
{
  "url": "https://accounts.google.com/o/oauth2/auth?..."
}
```

#### OAuth Callback
```http
GET /api/v1/google-ads/auth/callback?code={authorization_code}
```

#### Check Token Status
```http
GET /api/v1/google-ads/auth/token
```

**Response:**
```json
{
  "authenticated": true,
  "token": {
    "access_token": "...",
    "refresh_token": "...",
    "scope": "...",
    "token_type": "Bearer",
    "expiry_date": 1234567890
  }
}
```

## 🔐 Security

### Environment Variables
All sensitive configuration is managed through environment variables. Never commit `.env` files to version control.

### JWT Authentication
- Secure token-based authentication
- Configurable expiration times
- Environment-specific secret keys

### Rate Limiting
- Configurable request limits
- Window-based rate limiting
- Protection against abuse

### CORS Configuration
- Configurable origin restrictions
- Secure credential handling
- Development/production environment support

## 🏗️ Architecture

### Directory Structure
```
src/
├── modules/
│   └── google-ads/
│       ├── api/
│       │   ├── client.js      # Google Ads API client
│       │   ├── customer.js    # Customer management
│       │   ├── report.js      # Report generation
│       │   └── index.js       # API module exports
│       ├── auth/
│       │   ├── service.js     # OAuth2 authentication service
│       │   └── routes.js      # Authentication routes
│       ├── service.js         # Main Google Ads service
│       └── routes.js          # Google Ads API routes
├── services/                  # Business logic services
├── models/                    # Data models
├── config/                    # Configuration files
├── workers/                   # Background workers
├── utils/                     # Utility functions
├── api/                       # API routes and controllers
└── app.js                     # Express application setup
```

### Key Components

#### Google Ads Module
- **Client**: Handles Google Ads API communication
- **Authentication**: OAuth2 flow management
- **Service**: Business logic for account operations
- **Routes**: RESTful API endpoints

#### Security Middleware
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Error Handling**: Centralized error management

## 🚀 Deployment

### Production Environment
1. Set `NODE_ENV=production`
2. Configure production environment variables
3. Use a process manager (PM2, Docker, etc.)
4. Set up reverse proxy (Nginx, Apache)
5. Configure SSL/TLS certificates

### Docker Deployment
```bash
# Build image
docker build -t clickguard-backend .

# Run container
docker run -p 3000:3000 --env-file .env clickguard-backend
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com
JWT_SECRET=your-production-jwt-secret
# ... other production variables
```

## 🧪 Testing

### Manual Testing
1. Start the server: `npm run dev`
2. Test health endpoint: `curl http://localhost:3000/health`
3. Test Google Ads status: `curl http://localhost:3000/api/v1/google-ads/status`

### API Testing
Use tools like Postman, Insomnia, or curl to test endpoints:
```bash
# Test connection
curl -X POST http://localhost:3000/api/v1/google-ads/test-connection

# Get accounts
curl http://localhost:3000/api/v1/google-ads/accounts
```

## 📝 Logging

The application uses structured logging with different levels:
- **Error**: Application errors and exceptions
- **Warn**: Warning messages
- **Info**: General information
- **Debug**: Detailed debugging information

### Log Configuration
```env
LOG_LEVEL=debug  # Set to 'error' in production
```

## 🔧 Troubleshooting

### Common Issues

#### Google Ads API Errors
- Verify developer token is valid
- Check OAuth2 credentials
- Ensure API access is enabled in Google Cloud Console

#### Authentication Issues
- Verify client ID and secret
- Check refresh token validity
- Ensure proper OAuth2 scopes

#### Connection Problems
- Verify network connectivity
- Check firewall settings
- Validate API endpoints

### Debug Mode
Enable debug logging by setting `LOG_LEVEL=debug` in your `.env` file.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting section

## Deployment Guide

### 1. Prerequisites
- **Node.js v18+** (v22 recommended)
- **npm**
- **git**
- A Linux server (Ubuntu/Debian recommended) or a Node.js-compatible cloud platform

### 2. Clone the Repository
```sh
git clone <your-repo-url>
cd ClickGuard/apps/backend
```

### 3. Install Dependencies
```sh
npm install
```

### 4. Configure Environment Variables
- Copy `.env.example` to `.env`:
  ```sh
  cp .env.example .env
  ```
- Edit `.env` and set production values for secrets, API keys, and URLs.

### 5. Start the Server (Production)
- **Recommended:** Use [PM2](https://pm2.keymetrics.io/) to keep your server running and auto-restart on crash/reboot.

```sh
npm install -g pm2
pm2 start server.js --name clickguard-backend
pm2 save
pm2 startup
```

### 6. (Optional) Set Up a Reverse Proxy & HTTPS
- Use [Nginx](https://nginx.org/) or [Caddy](https://caddyserver.com/) to serve your app securely over HTTPS and forward requests to your Node.js server.
- Example Nginx config:
  ```nginx
  server {
    listen 80;
    server_name yourdomain.com;
    location / {
      proxy_pass http://localhost:3001;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
  ```
- Use [Let's Encrypt](https://letsencrypt.org/) for free SSL certificates.

### 7. Security & Best Practices
- Use strong, unique secrets in `.env`.
- Restrict CORS to your frontend domain.
- Keep your server and dependencies up to date.
- Set up monitoring/logging (e.g., PM2 logs, Sentry, etc.).
- Remove or protect test/demo endpoints in production.

### 8. Testing
- Visit `/api/v1/tracker/test` and `/api/v1/tracker/script` on your production domain to verify deployment.
- Test with a `gclid` parameter to simulate Google Ads clicks.

**Anti-Fraud Features:**
- Partial-match allowlist for Polish ISPs/orgs (case-insensitive, substring match)
- /16 subnet fraud tracking
- Improved, focused logging

---

For any issues, see the code comments or contact the maintainer.

**ClickGuard Backend** - Secure, scalable, and reliable Google Ads API integration for click fraud detection.

## Tracker Integration

To enable tracking on your website, simply add:

```html
<script src="https://your-backend.com/api/v1/tracker/script"></script>
```

**Note:** The tracker script now dynamically detects the backend endpoint based on its own src URL. No manual endpoint configuration is required. You can use the same script tag on any site, and it will always POST to the correct backend. 
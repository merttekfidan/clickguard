# ClickGuard Beta

A simplified beta version of ClickGuard - Google Ads click fraud protection without complex infrastructure.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Google Ads API access
- Google OAuth credentials

### Backend Setup

1. Navigate to the backend directory:
```bash
cd apps/backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp env.example .env
```

4. Configure your environment variables in `.env`:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Backend URL
BACKEND_URL=http://localhost:3000

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Ads API Configuration
GOOGLE_ADS_DEVELOPER_TOKEN=your-google-ads-developer-token
```

5. Start the backend:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd apps/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Start the frontend:
```bash
npm run dev
```

## 🔧 Features

### Beta Version Features
- ✅ Google OAuth authentication
- ✅ Google Ads account connection
- ✅ Display Google Ads Customer ID (CID)
- ✅ Account information retrieval
- ✅ Simplified in-memory storage
- ✅ No database dependencies
- ✅ No message queue
- ✅ No Docker requirements

  
## 📋 Google Ads Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable APIs**
   - Enable Google Ads API
   - Enable Google+ API

3. **Create OAuth Credentials**
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `http://localhost:3000/api/v1/auth/google/callback`

4. **Get Google Ads Developer Token**
   - Apply for Google Ads API access
   - Get your developer token from Google Ads

## 🔗 API Endpoints

### Authentication
- `GET /api/v1/auth/google` - Initiate Google OAuth
- `GET /api/v1/auth/google/callback` - OAuth callback
- `GET /api/v1/auth/verify` - Verify JWT token
- `POST /api/v1/auth/logout` - Logout

### Google Ads
- `POST /api/v1/google-ads/connect` - Connect Google Ads account
- `GET /api/v1/google-ads/accounts` - Get all connected accounts
- `GET /api/v1/google-ads/account/:id` - Get specific account info
- `DELETE /api/v1/google-ads/account/:id` - Disconnect account

## 🏗️ Architecture

### Simplified Beta Architecture
```
Frontend (React + Vite)
    ↓ HTTP
Backend (Express + Passport)
    ↓ Google APIs
Google OAuth + Google Ads API
```

### Data Storage
- **In-Memory Storage**: All data stored in memory (resets on server restart)
- **JWT Tokens**: Authentication tokens stored in browser localStorage
- **No Persistence**: Data is not persisted between server restarts

## 🚧 Development Notes

### Current Limitations
- Data is lost on server restart
- No user management
- No data persistence
- Limited to single server instance
- No production-ready security

### Next Steps for Production
- Add database (PostgreSQL/MongoDB)
- Implement proper user management
- Add data persistence
- Implement IP blocking functionality
- Add proper error handling
- Add monitoring and logging
- Add rate limiting
- Add security headers

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

This is a beta version. For production use, additional features and security measures are required. 

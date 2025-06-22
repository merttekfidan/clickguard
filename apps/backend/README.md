# ClickGuard Backend - Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Services](#services)
8. [Workers](#workers)
9. [Development](#development)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

## Overview

ClickGuard is a SaaS platform that provides real-time click fraud detection and automated IP blocking for Google Ads campaigns. The backend is built with Node.js, Express, PostgreSQL, and RabbitMQ, following a queue-based architecture for high scalability and reliability.

### Key Features
- Real-time click fraud detection
- Automated IP blocking in Google Ads
- IP reputation checking
- Geographic anomaly detection
- WebSocket real-time notifications
- Multi-account support
- Comprehensive analytics

## Architecture

The system follows a modular monolith architecture with three main components:

1. **Ingestion Layer**: Fast API endpoints that accept click data and queue it
2. **Processing Layer**: Background workers that analyze clicks and make decisions
3. **Action Layer**: Workers that execute actions (like blocking IPs) in Google Ads

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Message Queue**: RabbitMQ
- **Real-time**: Socket.IO
- **Authentication**: JWT + Google OAuth
- **External APIs**: Google Ads API, IP Quality Score

## Installation

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 12 or higher
- RabbitMQ 3.8 or higher
- Redis (optional, for caching)

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp env.example .env
# Edit .env with your configuration
```

4. **Set up database**
```bash
# Create PostgreSQL database
createdb clickguard

# Run migrations (if using Sequelize CLI)
npm run migrate
```

5. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/clickguard

# Authentication
JWT_SECRET=your_jwt_secret_key_here

# Google OAuth & API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token

# Queue
RABBITMQ_URL=amqp://localhost

# External Services
IP_REPUTATION_API_KEY=your_ipqualityscore_key

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
```

### Required External Services

1. **Google Ads API**
   - Create a Google Cloud project
   - Enable Google Ads API
   - Generate OAuth 2.0 credentials
   - Get developer token from Google Ads

2. **IP Quality Score**
   - Sign up at ipqualityscore.com
   - Get API key for IP reputation checking

## API Reference

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Click Tracking API

#### POST /track
Track a click for fraud analysis.

**Headers:**
```
X-API-Key: <user_api_key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "keyword": "click fraud protection",
  "gclid": "abc123",
  "campaignId": "123456789",
  "adGroupId": "987654321",
  "referrer": "https://google.com",
  "landingPage": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Click queued for processing",
  "data": {
    "ipAddress": "192.168.1.1",
    "accountId": "uuid",
    "queuedAt": "2024-01-01T00:00:00.000Z",
    "processingTime": 15
  }
}
```

### Dashboard API

#### GET /dashboard/overview
Get dashboard overview statistics.

**Query Parameters:**
- `timeRange`: 24h, 7d, 30d (default: 24h)

**Response:**
```json
{
  "success": true,
  "data": {
    "timeRange": "24h",
    "totalClicks": 1250,
    "averageFraudScore": 23,
    "highRiskClicks": 45,
    "totalBlockedIPs": 12,
    "recentThreats": [...]
  }
}
```

#### GET /dashboard/clicks
Get click logs with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `accountId`: Filter by account
- `fraudScore`: Filter by minimum fraud score
- `action`: Filter by decision action

#### GET /dashboard/blocked-ips
Get blocked IP addresses.

#### POST /dashboard/blocked-ips/:id/unblock
Unblock an IP address.

#### GET /dashboard/analytics/fraud-trends
Get fraud trend analytics.

#### GET /dashboard/analytics/geographic
Get geographic distribution data.

#### GET /dashboard/analytics/ip-reputation
Get IP reputation statistics.

### Authentication API

#### POST /auth/google
Authenticate with Google OAuth.

#### POST /auth/refresh
Refresh JWT token.

#### POST /auth/logout
Logout and invalidate token.

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  google_id VARCHAR UNIQUE,
  subscription_status ENUM('active', 'inactive', 'trial') DEFAULT 'trial',
  api_key VARCHAR UNIQUE NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  avatar VARCHAR,
  last_login_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Connected Accounts Table
```sql
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  google_ads_account_id VARCHAR UNIQUE NOT NULL,
  google_ads_account_name VARCHAR NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Click Logs Table
```sql
CREATE TABLE click_logs (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID REFERENCES connected_accounts(id),
  ip_address VARCHAR NOT NULL,
  user_agent TEXT,
  keyword VARCHAR,
  gclid VARCHAR,
  campaign_id VARCHAR,
  ad_group_id VARCHAR,
  is_vpn BOOLEAN DEFAULT false,
  is_proxy BOOLEAN DEFAULT false,
  is_hosting BOOLEAN DEFAULT false,
  is_tor BOOLEAN DEFAULT false,
  country VARCHAR,
  city VARCHAR,
  region VARCHAR,
  fraud_score INTEGER DEFAULT 0,
  decision JSONB DEFAULT '{}',
  ip_reputation_data JSONB,
  processing_time INTEGER,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Blocked IPs Table
```sql
CREATE TABLE blocked_ips (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID REFERENCES connected_accounts(id),
  ip_address VARCHAR NOT NULL,
  reason VARCHAR NOT NULL,
  fraud_score INTEGER,
  block_source ENUM('AUTO', 'MANUAL', 'API') DEFAULT 'AUTO',
  is_active BOOLEAN DEFAULT true,
  block_timestamp TIMESTAMP DEFAULT NOW(),
  unblock_timestamp TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  click_count INTEGER DEFAULT 0,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Services

### Queue Service
Manages RabbitMQ connections and message handling.

**Key Methods:**
- `initializeQueue()`: Set up RabbitMQ connection
- `publishMessage(queueName, message)`: Publish message to queue
- `consumeMessages(queueName, callback)`: Consume messages from queue

### IP Reputation Service
Checks IP addresses against external reputation APIs.

**Key Methods:**
- `checkIPReputation(ipAddress)`: Get IP reputation data
- `isSuspicious(ipAddress, threshold)`: Check if IP is suspicious

### Rule Engine Service
Implements fraud detection rules and logic.

**Rules:**
- VPN/Proxy detection
- High fraud score
- Repeated clicks
- Geographic anomalies
- Suspicious user agents
- TOR network detection

### Google Ads Service
Manages Google Ads API interactions.

**Key Methods:**
- `blockIP(accountId, ipAddress, reason)`: Block IP in Google Ads
- `unblockIP(accountId, ipAddress)`: Unblock IP in Google Ads
- `getAccountInfo(accountId)`: Get account information

### WebSocket Service
Handles real-time communication with frontend.

**Key Methods:**
- `emitToUser(userId, eventName, payload)`: Send message to user
- `emitToAccount(accountId, eventName, payload)`: Send message to account
- `emitIPBlocked(userId, accountId, data)`: Notify about IP blocking

## Workers

### Click Processor Worker
Processes click data from the queue.

**Workflow:**
1. Receive click data from queue
2. Enrich with IP reputation data
3. Run fraud detection rules
4. Save to database
5. Queue action if needed

### Google Ads Action Worker
Executes actions in Google Ads.

**Workflow:**
1. Receive action from queue
2. Execute in Google Ads API
3. Update database records
4. Send real-time notifications
5. Handle retries on failure

## Development

### Project Structure
```
backend/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── routes/
│   ├── config/
│   ├── models/
│   ├── services/
│   ├── workers/
│   └── utils/
├── server.js
├── package.json
└── .env
```

### Running in Development
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Database Migrations
```bash
npm run migrate
npm run seed
```

### Code Style
The project uses ESLint for code linting. Run:
```bash
npm run lint
```

## Deployment

### Production Setup

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Use strong JWT secrets
   - Configure production database URL
   - Set up SSL certificates

2. **Database**
   - Use managed PostgreSQL service
   - Set up connection pooling
   - Configure backups

3. **Message Queue**
   - Use managed RabbitMQ service
   - Configure clustering for high availability

4. **Process Management**
   - Use PM2 for process management
   - Set up monitoring and logging
   - Configure auto-restart

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/clickguard
JWT_SECRET=very_long_and_secure_secret
RABBITMQ_URL=amqp://user:pass@host:5672
IP_REPUTATION_API_KEY=your_key
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_token
ENCRYPTION_KEY=32_character_encryption_key
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify PostgreSQL is running
   - Check firewall settings

2. **RabbitMQ Connection Failed**
   - Verify RabbitMQ is running
   - Check RABBITMQ_URL format
   - Ensure ports are accessible

3. **Google Ads API Errors**
   - Verify developer token
   - Check OAuth credentials
   - Ensure account has proper permissions

4. **IP Reputation API Errors**
   - Verify API key
   - Check rate limits
   - Ensure IP address format is correct

### Logs
The application uses structured logging. Check logs for:
- Database connection errors
- Queue processing errors
- API rate limiting
- Authentication failures

### Health Checks
Use the health check endpoint:
```bash
curl http://localhost:3000/health
```

### Monitoring
Monitor these metrics:
- Queue depth
- Processing times
- Error rates
- Database performance
- API response times

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Verify configuration
4. Contact the development team

## License

This project is proprietary software. All rights reserved. 
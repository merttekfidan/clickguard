# ClickGuard API Documentation

## Overview

This document provides detailed information about the ClickGuard API endpoints, including request/response formats, authentication, and usage examples.

## Base Information

- **Base URL**: `http://localhost:3000/api/v1`
- **Content Type**: `application/json`
- **Authentication**: JWT Bearer tokens or API keys (depending on endpoint)

## Authentication

### JWT Authentication
For dashboard endpoints, include the JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### API Key Authentication
For tracking endpoints, include the API key in the X-API-Key header:
```
X-API-Key: <user_api_key>
```

## Endpoints

### 1. Click Tracking

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
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "keyword": "click fraud protection",
  "gclid": "abc123def456",
  "campaignId": "123456789",
  "adGroupId": "987654321",
  "referrer": "https://www.google.com/search?q=click+fraud",
  "landingPage": "https://example.com/landing-page"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Click queued for processing",
  "data": {
    "ipAddress": "192.168.1.1",
    "accountId": "550e8400-e29b-41d4-a716-446655440000",
    "queuedAt": "2024-01-01T12:00:00.000Z",
    "processingTime": 15
  }
}
```

**Error Responses:**

*Invalid API Key (401):*
```json
{
  "error": "Invalid API key",
  "message": "The provided API key is invalid or account is inactive"
}
```

*Validation Error (400):*
```json
{
  "error": "Validation error",
  "message": "\"ipAddress\" is required",
  "details": [
    {
      "message": "\"ipAddress\" is required",
      "path": ["ipAddress"],
      "type": "any.required"
    }
  ]
}
```

### 2. Dashboard Overview

#### GET /dashboard/overview
Get dashboard overview statistics.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `timeRange` (optional): `24h`, `7d`, `30d` (default: `24h`)

**Example Request:**
```
GET /dashboard/overview?timeRange=7d
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timeRange": "7d",
    "totalClicks": 1250,
    "averageFraudScore": 23,
    "highRiskClicks": 45,
    "totalBlockedIPs": 12,
    "recentThreats": [
      {
        "id": 12345,
        "ipAddress": "192.168.1.100",
        "fraudScore": 85,
        "reason": "VPN Detected",
        "timestamp": "2024-01-01T11:30:00.000Z",
        "accountName": "My Google Ads Account"
      }
    ]
  }
}
```

### 3. Click Logs

#### GET /dashboard/clicks
Get click logs with pagination and filtering.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `accountId` (optional): Filter by specific account
- `fraudScore` (optional): Filter by minimum fraud score
- `action` (optional): Filter by decision action (`MONITOR`, `BLOCK_IP`)

**Example Request:**
```
GET /dashboard/clicks?page=1&limit=20&fraudScore=70&action=BLOCK_IP
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clicks": [
      {
        "id": 12345,
        "ipAddress": "192.168.1.100",
        "fraudScore": 85,
        "decision": {
          "action": "BLOCK_IP",
          "reason": "VPN Detected",
          "priority": "HIGH"
        },
        "country": "US",
        "city": "New York",
        "isVpn": true,
        "isProxy": false,
        "isTor": false,
        "timestamp": "2024-01-01T11:30:00.000Z",
        "accountName": "My Google Ads Account"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

#### GET /dashboard/clicks/:id
Get detailed information about a specific click.

**Example Request:**
```
GET /dashboard/clicks/12345
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 12345,
    "accountId": "550e8400-e29b-41d4-a716-446655440000",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "keyword": "click fraud protection",
    "gclid": "abc123def456",
    "campaignId": "123456789",
    "adGroupId": "987654321",
    "isVpn": true,
    "isProxy": false,
    "isHosting": false,
    "isTor": false,
    "country": "US",
    "city": "New York",
    "region": "NY",
    "fraudScore": 85,
    "decision": {
      "action": "BLOCK_IP",
      "reason": "VPN Detected",
      "priority": "HIGH"
    },
    "ipReputationData": {
      "isp": "VPN Provider",
      "organization": "VPN Corp",
      "riskLevel": "high"
    },
    "processingTime": 150,
    "timestamp": "2024-01-01T11:30:00.000Z",
    "createdAt": "2024-01-01T11:30:00.000Z",
    "updatedAt": "2024-01-01T11:30:00.000Z"
  }
}
```

### 4. Blocked IPs

#### GET /dashboard/blocked-ips
Get list of blocked IP addresses.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `accountId` (optional): Filter by specific account

**Response:**
```json
{
  "success": true,
  "data": {
    "blockedIPs": [
      {
        "id": 67890,
        "ipAddress": "192.168.1.100",
        "reason": "VPN Detected",
        "fraudScore": 85,
        "blockSource": "AUTO",
        "blockTimestamp": "2024-01-01T11:30:00.000Z",
        "clickCount": 3,
        "lastSeenAt": "2024-01-01T11:30:00.000Z",
        "accountName": "My Google Ads Account"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 12,
      "pages": 1
    }
  }
}
```

#### POST /dashboard/blocked-ips/:id/unblock
Unblock a specific IP address.

**Example Request:**
```
POST /dashboard/blocked-ips/67890/unblock
```

**Response:**
```json
{
  "success": true,
  "message": "IP 192.168.1.100 has been unblocked"
}
```

### 5. Analytics

#### GET /dashboard/analytics/fraud-trends
Get fraud trend analytics over time.

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 7)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "totalClicks": 150,
      "averageFraudScore": 25,
      "highRiskClicks": 8
    },
    {
      "date": "2024-01-02",
      "totalClicks": 180,
      "averageFraudScore": 30,
      "highRiskClicks": 12
    }
  ]
}
```

#### GET /dashboard/analytics/geographic
Get geographic distribution of clicks.

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 7)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "country": "US",
      "totalClicks": 500,
      "averageFraudScore": 20,
      "highRiskClicks": 15
    },
    {
      "country": "CA",
      "totalClicks": 200,
      "averageFraudScore": 15,
      "highRiskClicks": 5
    }
  ]
}
```

#### GET /dashboard/analytics/ip-reputation
Get IP reputation statistics.

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 7)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalClicks": 1000,
    "vpnClicks": 25,
    "proxyClicks": 15,
    "torClicks": 5,
    "hostingClicks": 10,
    "percentages": {
      "vpn": 2.5,
      "proxy": 1.5,
      "tor": 0.5,
      "hosting": 1.0
    }
  }
}
```

### 6. Connected Accounts

#### GET /dashboard/accounts
Get list of connected Google Ads accounts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "googleAdsAccountId": "123-456-7890",
      "googleAdsAccountName": "My Google Ads Account",
      "isActive": true,
      "lastSyncAt": "2024-01-01T10:00:00.000Z",
      "settings": {
        "autoBlock": true,
        "fraudScoreThreshold": 70,
        "notificationEmail": true,
        "notificationWebhook": false
      }
    }
  ]
}
```

#### GET /dashboard/accounts/:id
Get detailed information about a specific account.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-uuid",
    "googleAdsAccountId": "123-456-7890",
    "googleAdsAccountName": "My Google Ads Account",
    "isActive": true,
    "lastSyncAt": "2024-01-01T10:00:00.000Z",
    "settings": {
      "autoBlock": true,
      "fraudScoreThreshold": 70,
      "notificationEmail": true,
      "notificationWebhook": false
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
}
```

#### POST /dashboard/accounts/:id/test-connection
Test the connection to a Google Ads account.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Connection successful"
  }
}
```

### 7. Settings

#### GET /dashboard/settings
Get user and account settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "subscriptionStatus": "active",
      "apiKey": "api_key_here"
    },
    "accounts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "googleAdsAccountName": "My Google Ads Account",
        "settings": {
          "autoBlock": true,
          "fraudScoreThreshold": 70,
          "notificationEmail": true,
          "notificationWebhook": false
        }
      }
    ]
  }
}
```

#### PUT /dashboard/settings
Update account settings.

**Request Body:**
```json
{
  "accountId": "550e8400-e29b-41d4-a716-446655440000",
  "settings": {
    "autoBlock": true,
    "fraudScoreThreshold": 75,
    "notificationEmail": true,
    "notificationWebhook": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

### 8. Recent Events

#### GET /dashboard/events
Get recent high-risk events and blocked IPs.

**Query Parameters:**
- `limit` (optional): Number of events to return (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "HIGH_RISK_CLICK",
      "id": 12345,
      "ipAddress": "192.168.1.100",
      "fraudScore": 85,
      "reason": "VPN Detected",
      "timestamp": "2024-01-01T11:30:00.000Z",
      "accountName": "My Google Ads Account"
    },
    {
      "type": "IP_BLOCKED",
      "id": 67890,
      "ipAddress": "192.168.1.101",
      "reason": "High Fraud Score",
      "fraudScore": 90,
      "timestamp": "2024-01-01T11:25:00.000Z",
      "accountName": "My Google Ads Account"
    }
  ]
}
```

## Error Handling

### Standard Error Response Format
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": [] // Optional additional error details
}
```

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **202 Accepted**: Request accepted for processing
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation failed
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Rate Limiting

The API implements rate limiting:
- **Dashboard endpoints**: 100 requests per 15 minutes per IP
- **Tracking endpoints**: 1000 requests per minute per API key

When rate limited, you'll receive a 429 response:
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests from this IP, please try again later."
}
```

## WebSocket Events

### Connection
Connect to WebSocket endpoint:
```
ws://localhost:3000
```

### Authentication
Send authentication event:
```json
{
  "event": "authenticate",
  "data": {
    "userId": "user-uuid",
    "token": "jwt-token"
  }
}
```

### Join Account Room
Join account-specific room for real-time updates:
```json
{
  "event": "joinAccount",
  "data": "account-uuid"
}
```

### Event Types

#### threat_detected
Emitted when a threat is detected:
```json
{
  "type": "IP_BLOCKED",
  "timestamp": "2024-01-01T11:30:00.000Z",
  "data": {
    "ipAddress": "192.168.1.100",
    "reason": "VPN Detected",
    "fraudScore": 85,
    "accountId": "account-uuid"
  }
}
```

#### system_alert
Emitted for system notifications:
```json
{
  "type": "SYSTEM_ALERT",
  "timestamp": "2024-01-01T11:30:00.000Z",
  "data": {
    "level": "success",
    "message": "IP 192.168.1.100 has been blocked",
    "accountId": "account-uuid"
  }
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

class ClickGuardAPI {
  constructor(baseURL, apiKey) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  async trackClick(clickData) {
    const response = await axios.post(`${this.baseURL}/track`, clickData, {
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async getDashboardOverview(token, timeRange = '24h') {
    const response = await axios.get(`${this.baseURL}/dashboard/overview`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: { timeRange }
    });
    return response.data;
  }
}

// Usage
const api = new ClickGuardAPI('http://localhost:3000/api/v1', 'your-api-key');

// Track a click
await api.trackClick({
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  keyword: 'click fraud protection'
});
```

### Python
```python
import requests

class ClickGuardAPI:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key

    def track_click(self, click_data):
        headers = {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        }
        response = requests.post(
            f"{self.base_url}/track",
            json=click_data,
            headers=headers
        )
        return response.json()

    def get_dashboard_overview(self, token, time_range='24h'):
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        params = {'timeRange': time_range}
        response = requests.get(
            f"{self.base_url}/dashboard/overview",
            headers=headers,
            params=params
        )
        return response.json()

# Usage
api = ClickGuardAPI('http://localhost:3000/api/v1', 'your-api-key')

# Track a click
result = api.track_click({
    'ipAddress': '192.168.1.1',
    'userAgent': 'Mozilla/5.0...',
    'keyword': 'click fraud protection'
})
```

## Best Practices

1. **Error Handling**: Always handle API errors gracefully
2. **Rate Limiting**: Implement exponential backoff for rate-limited requests
3. **Authentication**: Store tokens securely and refresh when needed
4. **Validation**: Validate data before sending to API
5. **Monitoring**: Monitor API response times and error rates
6. **Caching**: Cache dashboard data when appropriate
7. **WebSocket**: Use WebSocket for real-time updates instead of polling

## Support

For API support:
- Check the troubleshooting section in the main README
- Review application logs for detailed error information
- Contact the development team with specific error details 
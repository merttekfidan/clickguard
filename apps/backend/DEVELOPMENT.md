# ClickGuard Development Guide

## Table of Contents
1. [Overview](#overview)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Code Standards](#code-standards)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Database Management](#database-management)
8. [API Development](#api-development)
9. [Service Development](#service-development)
10. [Worker Development](#worker-development)
11. [Debugging](#debugging)
12. [Performance Optimization](#performance-optimization)
13. [Security Best Practices](#security-best-practices)
14. [Troubleshooting](#troubleshooting)

## Overview

This guide covers the development workflow, coding standards, and best practices for the ClickGuard backend. The project follows a modular architecture with clear separation of concerns.

## Development Environment Setup

### 1. Prerequisites

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install RabbitMQ
sudo apt install rabbitmq-server -y

# Install Redis (optional)
sudo apt install redis-server -y

# Install Git
sudo apt install git -y
```

### 2. Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd clickguard-backend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit environment variables
nano .env
```

### 3. Database Setup

```bash
# Create database
createdb clickguard_dev

# Run migrations
npm run migrate

# Seed data (optional)
npm run seed
```

### 4. IDE Setup

#### VS Code Extensions
- ESLint
- Prettier
- Node.js Extension Pack
- PostgreSQL
- Docker

#### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["javascript"],
  "files.exclude": {
    "**/node_modules": true,
    "**/logs": true
  }
}
```

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── controllers/     # HTTP request handlers
│   │   ├── middleware/      # Express middleware
│   │   └── routes/          # API route definitions
│   ├── config/              # Configuration files
│   ├── models/              # Database models
│   ├── services/            # Business logic services
│   ├── workers/             # Background workers
│   └── utils/               # Utility functions
├── tests/                   # Test files
├── logs/                    # Application logs
├── docs/                    # Documentation
├── server.js               # Application entry point
├── package.json
└── .env
```

### Key Directories Explained

#### `/src/api/controllers/`
Contains HTTP request handlers that:
- Validate incoming requests
- Call appropriate services
- Format responses
- Handle errors

#### `/src/api/middleware/`
Express middleware for:
- Authentication
- Request validation
- Rate limiting
- Logging
- Error handling

#### `/src/api/routes/`
API route definitions that:
- Define endpoint paths
- Apply middleware
- Connect to controllers

#### `/src/services/`
Business logic services that:
- Handle core application logic
- Interact with external APIs
- Manage data processing
- Implement business rules

#### `/src/workers/`
Background workers that:
- Process queued messages
- Handle long-running tasks
- Execute scheduled jobs
- Manage system resources

## Code Standards

### 1. JavaScript/Node.js Standards

#### Naming Conventions
```javascript
// Variables and functions: camelCase
const userAccount = getUserAccount();
const handleUserLogin = () => {};

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// Classes: PascalCase
class UserService {}
class ClickProcessor {}

// Files: kebab-case
user-service.js
click-processor.worker.js
```

#### Code Style
```javascript
// Use const by default, let when reassignment needed
const user = await getUser(id);
let retryCount = 0;

// Use arrow functions for callbacks
const users = await User.findAll({
  where: { active: true }
});

// Use async/await over promises
const processClick = async (clickData) => {
  try {
    const enrichedData = await enrichClickData(clickData);
    const decision = await analyzeClick(enrichedData);
    return decision;
  } catch (error) {
    logger.error('Failed to process click:', error);
    throw error;
  }
};

// Use early returns
const validateUser = (user) => {
  if (!user) {
    throw new Error('User is required');
  }
  
  if (!user.email) {
    throw new Error('Email is required');
  }
  
  return true;
};
```

#### Error Handling
```javascript
// Use custom error classes
class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

// Consistent error handling
const processRequest = async (req, res, next) => {
  try {
    const result = await service.process(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message,
        details: error.details
      });
    }
    
    logger.error('Unexpected error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};
```

### 2. Database Standards

#### Model Definitions
```javascript
// Use descriptive field names
const ClickLog = sequelize.define('ClickLog', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  accountId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'ConnectedAccounts',
      key: 'id'
    }
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIP: true
    }
  },
  // ... other fields
}, {
  tableName: 'click_logs',
  timestamps: true,
  indexes: [
    {
      fields: ['accountId', 'timestamp']
    },
    {
      fields: ['ipAddress']
    }
  ]
});
```

#### Query Patterns
```javascript
// Use specific field selection
const users = await User.findAll({
  attributes: ['id', 'email', 'createdAt'],
  where: { active: true },
  order: [['createdAt', 'DESC']],
  limit: 10
});

// Use includes for relationships
const account = await ConnectedAccount.findOne({
  where: { id: accountId },
  include: [{
    model: User,
    attributes: ['email', 'subscriptionStatus']
  }]
});

// Use transactions for data integrity
const transaction = await sequelize.transaction();
try {
  await ClickLog.create(clickData, { transaction });
  await BlockedIP.create(blockData, { transaction });
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

### 3. API Standards

#### Request Validation
```javascript
const Joi = require('joi');

const trackClickSchema = Joi.object({
  ipAddress: Joi.string().ip().required(),
  userAgent: Joi.string().max(500).required(),
  keyword: Joi.string().max(100).optional(),
  gclid: Joi.string().max(100).optional(),
  campaignId: Joi.string().max(50).optional(),
  adGroupId: Joi.string().max(50).optional(),
  referrer: Joi.string().uri().optional(),
  landingPage: Joi.string().uri().required()
});

const validateTrackClick = (req, res, next) => {
  const { error, value } = trackClickSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      message: error.details[0].message
    });
  }
  req.validatedData = value;
  next();
};
```

#### Response Format
```javascript
// Success response
res.json({
  success: true,
  data: result,
  message: 'Operation completed successfully'
});

// Error response
res.status(400).json({
  success: false,
  error: 'Validation error',
  message: 'Invalid input data',
  details: validationErrors
});

// Paginated response
res.json({
  success: true,
  data: {
    items: results,
    pagination: {
      page: 1,
      limit: 10,
      total: 100,
      pages: 10
    }
  }
});
```

## Development Workflow

### 1. Git Workflow

#### Branch Naming
```
feature/user-authentication
bugfix/fix-api-validation
hotfix/security-patch
refactor/improve-performance
```

#### Commit Messages
```
feat: add user authentication system
fix: resolve API validation issues
docs: update API documentation
refactor: improve database queries
test: add unit tests for user service
```

#### Pull Request Process
1. Create feature branch from `develop`
2. Make changes with proper commits
3. Write/update tests
4. Update documentation
5. Create pull request
6. Code review
7. Merge to `develop`

### 2. Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm test
npm run test:watch

# Run linting
npm run lint
npm run lint:fix

# Run database migrations
npm run migrate
npm run migrate:undo

# Seed database
npm run seed

# Check code coverage
npm run test:coverage
```

### 3. Environment Management

```bash
# Development environment
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/clickguard_dev

# Test environment
NODE_ENV=test
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/clickguard_test
```

## Testing

### 1. Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── services/
│   ├── models/
│   └── utils/
├── integration/       # Integration tests
│   ├── api/
│   └── database/
├── e2e/              # End-to-end tests
└── fixtures/         # Test data
```

### 2. Unit Testing

```javascript
// services/ipReputation.service.test.js
const { checkIPReputation } = require('../../src/services/ipReputation.service');

describe('IP Reputation Service', () => {
  test('should return reputation data for valid IP', async () => {
    const result = await checkIPReputation('8.8.8.8');
    
    expect(result).toHaveProperty('isVPN');
    expect(result).toHaveProperty('isProxy');
    expect(result).toHaveProperty('country');
  });

  test('should throw error for invalid IP', async () => {
    await expect(checkIPReputation('invalid-ip'))
      .rejects
      .toThrow('Invalid IP address');
  });
});
```

### 3. Integration Testing

```javascript
// api/tracker.test.js
const request = require('supertest');
const app = require('../../server');

describe('Tracker API', () => {
  test('POST /api/v1/track should accept valid click data', async () => {
    const response = await request(app)
      .post('/api/v1/track')
      .set('X-API-Key', 'valid-api-key')
      .send({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        keyword: 'test keyword'
      });

    expect(response.status).toBe(202);
    expect(response.body.success).toBe(true);
  });
});
```

### 4. Test Utilities

```javascript
// tests/utils/testHelpers.js
const { sequelize } = require('../../src/config/database');

const setupTestDatabase = async () => {
  await sequelize.sync({ force: true });
};

const cleanupTestDatabase = async () => {
  await sequelize.close();
};

const createTestUser = async (userData = {}) => {
  return await User.create({
    email: 'test@example.com',
    apiKey: 'test-api-key',
    ...userData
  });
};

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser
};
```

## Database Management

### 1. Migrations

```javascript
// migrations/001-create-users.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      // ... other fields
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};
```

### 2. Seeders

```javascript
// seeders/001-demo-users.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('users', [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'demo@clickguard.com',
        apiKey: 'demo-api-key-123',
        subscriptionStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};
```

### 3. Database Utilities

```javascript
// scripts/db-reset.js
const { sequelize } = require('../src/config/database');

const resetDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('Database reset successfully');
  } catch (error) {
    console.error('Failed to reset database:', error);
  } finally {
    await sequelize.close();
  }
};

resetDatabase();
```

## API Development

### 1. Controller Pattern

```javascript
// controllers/tracker.controller.js
const trackerService = require('../services/tracker.service');
const { validateTrackClick } = require('../middleware/validation');

class TrackerController {
  static async trackClick(req, res, next) {
    try {
      const { validatedData } = req;
      const { apiKey } = req.headers;

      const result = await trackerService.processClick(validatedData, apiKey);
      
      res.status(202).json({
        success: true,
        message: 'Click queued for processing',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TrackerController;
```

### 2. Route Definition

```javascript
// routes/tracker.routes.js
const express = require('express');
const TrackerController = require('../controllers/tracker.controller');
const { validateTrackClick } = require('../middleware/validation');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/track',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), // 15 minutes, 100 requests
  validateTrackClick,
  TrackerController.trackClick
);

module.exports = router;
```

### 3. Middleware Development

```javascript
// middleware/authentication.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Invalid token'
    });
  }
};

module.exports = { authenticateToken };
```

## Service Development

### 1. Service Pattern

```javascript
// services/tracker.service.js
const queueService = require('./queue.service');
const { validateApiKey } = require('../utils/validation');

class TrackerService {
  static async processClick(clickData, apiKey) {
    // Validate API key
    const account = await validateApiKey(apiKey);
    if (!account) {
      throw new Error('Invalid API key');
    }

    // Enrich click data
    const enrichedData = {
      ...clickData,
      accountId: account.id,
      timestamp: new Date()
    };

    // Queue for processing
    await queueService.publishMessage('click_processing_queue', enrichedData);

    return {
      ipAddress: clickData.ipAddress,
      accountId: account.id,
      queuedAt: new Date(),
      processingTime: Date.now() - enrichedData.timestamp
    };
  }
}

module.exports = TrackerService;
```

### 2. External API Integration

```javascript
// services/googleAds.service.js
const { GoogleAdsApi } = require('@google-ads/google-ads-api');

class GoogleAdsService {
  constructor() {
    this.client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN
    });
  }

  async blockIP(accountId, ipAddress, reason) {
    try {
      const customer = this.client.Customer({
        customer_id: accountId,
        refresh_token: await this.getRefreshToken(accountId)
      });

      // Implementation for blocking IP
      const result = await customer.customerNegativeCriterion.create({
        criterion: {
          ip_block: {
            ip_address: ipAddress
          }
        }
      });

      return result;
    } catch (error) {
      logger.error('Failed to block IP in Google Ads:', error);
      throw error;
    }
  }
}

module.exports = new GoogleAdsService();
```

## Worker Development

### 1. Worker Pattern

```javascript
// workers/clickProcessor.worker.js
const queueService = require('../services/queue.service');
const ipReputationService = require('../services/ipReputation.service');
const ruleEngineService = require('../services/ruleEngine.service');
const ClickLog = require('../models/ClickLog');

class ClickProcessorWorker {
  static async start() {
    try {
      await queueService.consumeMessages('click_processing_queue', async (message) => {
        await this.processClick(message);
      });
      
      console.log('Click processor worker started');
    } catch (error) {
      console.error('Failed to start click processor worker:', error);
      throw error;
    }
  }

  static async processClick(clickData) {
    try {
      // Enrich with IP reputation data
      const ipData = await ipReputationService.checkIPReputation(clickData.ipAddress);
      
      // Run fraud detection rules
      const decision = await ruleEngineService.analyzeClick({
        ...clickData,
        ...ipData
      });

      // Save to database
      await ClickLog.create({
        ...clickData,
        ...ipData,
        decision
      });

      // Queue action if needed
      if (decision.action === 'BLOCK_IP') {
        await queueService.publishMessage('google_ads_actions_queue', {
          action: 'BLOCK_IP',
          accountId: clickData.accountId,
          ipAddress: clickData.ipAddress,
          reason: decision.reason
        });
      }
    } catch (error) {
      console.error('Failed to process click:', error);
      throw error;
    }
  }
}

module.exports = ClickProcessorWorker;
```

### 2. Error Handling and Retries

```javascript
// workers/googleAdsAction.worker.js
const queueService = require('../services/queue.service');
const googleAdsService = require('../services/googleAds.service');
const BlockedIP = require('../models/BlockedIP');

class GoogleAdsActionWorker {
  static async start() {
    try {
      await queueService.consumeMessages('google_ads_actions_queue', async (message) => {
        await this.processAction(message);
      });
      
      console.log('Google Ads action worker started');
    } catch (error) {
      console.error('Failed to start Google Ads action worker:', error);
      throw error;
    }
  }

  static async processAction(actionData) {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        switch (actionData.action) {
          case 'BLOCK_IP':
            await googleAdsService.blockIP(
              actionData.accountId,
              actionData.ipAddress,
              actionData.reason
            );
            
            // Update database
            await BlockedIP.create({
              accountId: actionData.accountId,
              ipAddress: actionData.ipAddress,
              reason: actionData.reason,
              blockSource: 'AUTO'
            });
            break;
            
          default:
            throw new Error(`Unknown action: ${actionData.action}`);
        }
        
        // Success - break out of retry loop
        break;
        
      } catch (error) {
        retryCount++;
        
        if (retryCount >= maxRetries) {
          console.error(`Failed to process action after ${maxRetries} retries:`, error);
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

module.exports = GoogleAdsActionWorker;
```

## Debugging

### 1. Logging

```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'clickguard-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### 2. Debugging Tools

```javascript
// Development debugging
const debug = require('debug')('clickguard:worker');

debug('Processing click:', clickData);

// Use Node.js inspector
// Add to package.json scripts:
// "debug": "node --inspect server.js"
```

### 3. Error Tracking

```javascript
// middleware/errorHandler.js
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Send appropriate response
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication'
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

module.exports = errorHandler;
```

## Performance Optimization

### 1. Database Optimization

```javascript
// Use connection pooling
const sequelize = new Sequelize(databaseUrl, {
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Use indexes
await queryInterface.addIndex('click_logs', ['accountId', 'timestamp']);
await queryInterface.addIndex('click_logs', ['ipAddress']);

// Use pagination
const clicks = await ClickLog.findAndCountAll({
  where: { accountId },
  limit: 20,
  offset: (page - 1) * 20,
  order: [['timestamp', 'DESC']]
});
```

### 2. Caching

```javascript
// Redis caching
const redis = require('redis');
const client = redis.createClient();

const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await client.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Store original send method
      const originalSend = res.json;
      
      // Override send method
      res.json = function(data) {
        client.setex(key, duration, JSON.stringify(data));
        originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};
```

### 3. Queue Optimization

```javascript
// Batch processing
const batchSize = 100;
let batch = [];

const processBatch = async () => {
  if (batch.length > 0) {
    await ClickLog.bulkCreate(batch);
    batch = [];
  }
};

// Process messages in batches
await queueService.consumeMessages('click_processing_queue', async (message) => {
  batch.push(message);
  
  if (batch.length >= batchSize) {
    await processBatch();
  }
});

// Process remaining items
setInterval(processBatch, 5000);
```

## Security Best Practices

### 1. Input Validation

```javascript
// Sanitize inputs
const sanitizeInput = (input) => {
  return input.replace(/[<>]/g, '');
};

// Validate file uploads
const multer = require('multer');
const upload = multer({
  limits: {
    fileSize: 1024 * 1024, // 1MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});
```

### 2. Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const trackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute
  message: {
    error: 'Too many tracking requests',
    message: 'Please reduce request frequency'
  }
});
```

### 3. Security Headers

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Troubleshooting

### 1. Common Development Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U clickguard_user -d clickguard_dev

# Reset database
npm run db:reset
```

#### Queue Connection Issues
```bash
# Check RabbitMQ status
sudo systemctl status rabbitmq-server

# Check queue status
sudo rabbitmqctl list_queues

# Reset queues
sudo rabbitmqctl stop_app
sudo rabbitmqctl reset
sudo rabbitmqctl start_app
```

#### Memory Issues
```bash
# Check memory usage
node --max-old-space-size=4096 server.js

# Monitor with PM2
pm2 monit
```

### 2. Debugging Tools

```bash
# Node.js inspector
node --inspect server.js

# PM2 debugging
pm2 start server.js --node-args="--inspect"

# Database debugging
DEBUG=sequelize:* npm run dev
```

### 3. Performance Monitoring

```javascript
// Add performance monitoring
const performance = require('perf_hooks').performance;

const measurePerformance = (name) => {
  return (req, res, next) => {
    const start = performance.now();
    
    res.on('finish', () => {
      const duration = performance.now() - start;
      logger.info(`Performance: ${name} took ${duration}ms`);
    });
    
    next();
  };
};
```

## Support

For development issues:
1. Check the troubleshooting section above
2. Review application logs
3. Verify environment configuration
4. Check database and queue connections
5. Contact the development team with specific error details

## Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Sequelize Documentation](https://sequelize.org/docs/v6/)
- [RabbitMQ Tutorial](https://www.rabbitmq.com/tutorials/amqp-concepts.html)
- [JWT.io](https://jwt.io/)
- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/start) 
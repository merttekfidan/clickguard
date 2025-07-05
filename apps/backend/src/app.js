const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));
// Allow all origins for development or open API
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Passport for authentication
try {
  const authService = require('./modules/auth/auth.service');
  app.use(authService.initializePassport());
  console.log('✅ Passport initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Passport:', error.message);
}

// Register module routes
try {
  const authRoutes = require('./modules/auth/auth.routes');
  app.use('/api/v1/auth', authRoutes);
  console.log('✅ Auth routes registered successfully');
  console.log('📋 Available auth routes:');
  console.log('   GET /api/v1/auth/test');
  console.log('   GET /api/v1/auth/google');
  console.log('   GET /api/v1/auth/google/callback');
  console.log('   GET /api/v1/auth/logout');
  console.log('   GET /api/v1/auth/me');
} catch (error) {
  console.error('❌ Failed to register auth routes:', error.message);
  console.error('Stack trace:', error.stack);
}

const googleAdsRoutes = require('./modules/google-ads/routes');
const trackerRoutes = require('./modules/tracker/routes');

app.use('/api/v1/google-ads', googleAdsRoutes);
app.use('/api/v1/tracker', trackerRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint for Render.com
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

module.exports = app; 
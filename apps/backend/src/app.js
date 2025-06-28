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
// Allow all origins for public tracking endpoints
app.use(cors({
  origin: '*',
  credentials: false
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Register module routes
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

module.exports = app; 
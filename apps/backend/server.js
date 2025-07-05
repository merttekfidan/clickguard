const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import routes
const googleAdsRoutes = require('./src/modules/google-ads/routes');
const dashboardRoutes = require('./src/api/routes/dashboard');
const trackerRoutes = require('./src/modules/tracker/routes');
const authRoutes = require('./src/modules/auth/auth.routes');
const { initializePassport } = require('./src/modules/auth/auth.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(cors({
  origin: '*',
  credentials: false
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize passport and Google strategy
app.use(initializePassport());

// API Routes
app.use('/api/v1/google-ads', googleAdsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/tracker', trackerRoutes);
app.use('/api/v1/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Google Ads status endpoint
app.get('/api/v1/google-ads/status', (req, res) => {
  try {
    const GoogleAdsService = require('./src/modules/google-ads/service');
    const googleAdsService = new GoogleAdsService();
    
    try {
      const authStatus = googleAdsService.getAuthStatus();
      
      res.json({
        status: 'OK',
        googleAds: authStatus,
        timestamp: new Date().toISOString()
      });
    } catch (serviceError) {
      console.log('⚠️  Google Ads service error:', serviceError.message);
      res.json({
        status: 'OK',
        googleAds: {
          authenticated: false,
          error: serviceError.message
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error in Google Ads status endpoint:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize Google Ads authentication only if not skipped
    if (process.env.SKIP_GOOGLE_ADS_API !== 'true') {
      try {
        const GoogleAdsService = require('./src/modules/google-ads/service');
        const googleAdsService = new GoogleAdsService();
        
        // Check if initialize method exists before calling it
        if (typeof googleAdsService.initialize === 'function') {
          try {
            const authInitialized = await googleAdsService.initialize();
            
            if (authInitialized) {
              console.log('✅ Google Ads authentication initialized successfully');
            } else {
              console.log('⚠️  Google Ads authentication failed - some features may not work');
            }
          } catch (initError) {
            console.log('⚠️  Google Ads authentication failed:', initError.message);
            console.log('📝 This is expected if Google Ads credentials are not configured');
          }
        } else {
          console.log('⚠️  Google Ads authentication skipped - initialize method not available');
        }
      } catch (error) {
        console.log('⚠️  Google Ads authentication skipped:', error.message);
        console.log('📝 This is expected if Google Ads credentials are not configured');
      }
    } else {
      console.log('🟡 Skipping Google Ads initialization due to SKIP_GOOGLE_ADS_API flag.');
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 ClickGuard Google Ads Auth Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode enabled');
        console.log('🔐 Google Ads Status: http://localhost:3001/api/v1/google-ads/status');
        console.log('📊 Dashboard KPIs: http://localhost:3001/api/v1/dashboard/kpis');
        console.log('📈 Tracker Script: http://localhost:3001/api/v1/tracker/script');
        console.log('🧪 Tracker Test: http://localhost:3001/api/v1/tracker/test');
      }
    });

    // Store server reference for graceful shutdown
    global.server = server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close server
    if (global.server) {
      global.server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

// Serve the tracker public directory as static files
app.use(express.static(path.join(__dirname, 'src/modules/tracker/public'))); 
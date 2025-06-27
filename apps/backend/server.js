const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import only Google Ads routes
const googleAdsRoutes = require('./src/modules/google-ads/routes');

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
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Only Google Ads API Routes
app.use('/api/v1/google-ads', googleAdsRoutes);

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
    const authStatus = googleAdsService.getAuthStatus();
    
    res.json({
      status: 'OK',
      googleAds: authStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
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
    // Initialize Google Ads authentication only
    try {
      const GoogleAdsService = require('./src/modules/google-ads/service');
      const googleAdsService = new GoogleAdsService();
      const authInitialized = await googleAdsService.initialize();
      
      if (authInitialized) {
        console.log('✅ Google Ads authentication initialized successfully');
      } else {
        console.log('⚠️  Google Ads authentication failed - some features may not work');
      }
    } catch (error) {
      console.log('⚠️  Google Ads authentication skipped:', error.message);
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 ClickGuard Google Ads Auth Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode enabled');
        console.log('🔐 Google Ads Status: http://localhost:3000/api/v1/google-ads/status');
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
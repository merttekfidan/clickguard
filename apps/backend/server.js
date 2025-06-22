const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { initializeDatabase, syncModels } = require('./src/config/database');
const { initializeQueue } = require('./src/services/queue.service');
const { initializeWebSocket } = require('./src/services/websocket.service');

// Import routes
const trackerRoutes = require('./src/api/routes/tracker.routes');
const dashboardRoutes = require('./src/api/routes/dashboard.routes');
const authRoutes = require('./src/api/routes/auth.routes');

// Import workers
const clickProcessorWorker = require('./src/workers/clickProcessor.worker');
const googleAdsActionWorker = require('./src/workers/googleAdsAction.worker');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'ClickGuard Backend'
  });
});

// API routes
app.use('/api/v1/track', trackerRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/auth', authRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize services and start server
const initializeServices = async () => {
  try {
    console.log('🚀 Initializing ClickGuard Backend...');
    
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Sync models
    await syncModels();
    console.log('✅ Models synchronized');
    
    // Initialize passport after models are available
    require('./src/config/passport');
    console.log('✅ Passport initialized');
    
    // Initialize message queue
    await initializeQueue();
    console.log('✅ Message queue initialized');
    
    // Initialize WebSocket service
    initializeWebSocket(io);
    console.log('✅ WebSocket service initialized');
    
    // Start workers
    clickProcessorWorker.start();
    googleAdsActionWorker.start();
    console.log('✅ Workers started');
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🎯 ClickGuard Backend running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 Environment: ${process.env.NODE_ENV}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop workers
    await clickProcessorWorker.stop();
    await googleAdsActionWorker.stop();
    console.log('✅ Workers stopped');
    
    // Close server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
    
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

// Start the application
initializeServices(); 
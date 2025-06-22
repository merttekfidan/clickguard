let io;

// Map to store user connections
const userConnections = new Map();

const initializeWebSocket = (socketIO) => {
  io = socketIO;
  
  io.on('connection', (socket) => {
    console.log(`🔌 New WebSocket connection: ${socket.id}`);

    // Handle user authentication
    socket.on('authenticate', (data) => {
      try {
        const { userId, token } = data;
        
        // Store user connection
        if (!userConnections.has(userId)) {
          userConnections.set(userId, new Set());
        }
        userConnections.get(userId).add(socket.id);
        
        // Store user ID in socket
        socket.userId = userId;
        
        console.log(`✅ User ${userId} authenticated on socket ${socket.id}`);
        
        socket.emit('authenticated', { success: true });
      } catch (error) {
        console.error('❌ WebSocket authentication error:', error);
        socket.emit('authenticated', { success: false, error: error.message });
      }
    });

    // Handle user joining a room (for account-specific updates)
    socket.on('joinAccount', (accountId) => {
      try {
        socket.join(`account_${accountId}`);
        console.log(`👥 Socket ${socket.id} joined account room: ${accountId}`);
        socket.emit('joinedAccount', { accountId, success: true });
      } catch (error) {
        console.error('❌ Error joining account room:', error);
        socket.emit('joinedAccount', { success: false, error: error.message });
      }
    });

    // Handle user leaving a room
    socket.on('leaveAccount', (accountId) => {
      try {
        socket.leave(`account_${accountId}`);
        console.log(`👋 Socket ${socket.id} left account room: ${accountId}`);
      } catch (error) {
        console.error('❌ Error leaving account room:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket disconnected: ${socket.id}`);
      
      // Remove from user connections
      if (socket.userId) {
        const userSockets = userConnections.get(socket.userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            userConnections.delete(socket.userId);
          }
        }
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Handle error
    socket.on('error', (error) => {
      console.error(`❌ WebSocket error on ${socket.id}:`, error);
    });
  });

  console.log('✅ WebSocket service initialized');
};

const emitToUser = (userId, eventName, payload) => {
  try {
    const userSockets = userConnections.get(userId);
    if (userSockets && userSockets.size > 0) {
      userSockets.forEach(socketId => {
        io.to(socketId).emit(eventName, payload);
      });
      console.log(`📡 Emitted ${eventName} to user ${userId} (${userSockets.size} sockets)`);
    } else {
      console.log(`ℹ️ No active sockets for user ${userId}`);
    }
  } catch (error) {
    console.error(`❌ Error emitting to user ${userId}:`, error);
  }
};

const emitToAccount = (accountId, eventName, payload) => {
  try {
    io.to(`account_${accountId}`).emit(eventName, payload);
    console.log(`📡 Emitted ${eventName} to account ${accountId}`);
  } catch (error) {
    console.error(`❌ Error emitting to account ${accountId}:`, error);
  }
};

const emitToAll = (eventName, payload) => {
  try {
    io.emit(eventName, payload);
    console.log(`📡 Emitted ${eventName} to all connected clients`);
  } catch (error) {
    console.error(`❌ Error emitting to all clients:`, error);
  }
};

// Specific event emitters for ClickGuard
const emitIPBlocked = (userId, accountId, data) => {
  const payload = {
    type: 'IP_BLOCKED',
    timestamp: new Date().toISOString(),
    data: {
      ipAddress: data.ipAddress,
      reason: data.reason,
      fraudScore: data.fraudScore,
      accountId
    }
  };

  emitToUser(userId, 'threat_detected', payload);
  emitToAccount(accountId, 'ip_blocked', payload);
};

const emitFraudDetected = (userId, accountId, data) => {
  const payload = {
    type: 'FRAUD_DETECTED',
    timestamp: new Date().toISOString(),
    data: {
      ipAddress: data.ipAddress,
      fraudScore: data.fraudScore,
      reason: data.reason,
      accountId
    }
  };

  emitToUser(userId, 'threat_detected', payload);
  emitToAccount(accountId, 'fraud_detected', payload);
};

const emitClickProcessed = (userId, accountId, data) => {
  const payload = {
    type: 'CLICK_PROCESSED',
    timestamp: new Date().toISOString(),
    data: {
      ipAddress: data.ipAddress,
      fraudScore: data.fraudScore,
      decision: data.decision,
      accountId
    }
  };

  emitToAccount(accountId, 'click_processed', payload);
};

const emitSystemAlert = (userId, accountId, alert) => {
  const payload = {
    type: 'SYSTEM_ALERT',
    timestamp: new Date().toISOString(),
    data: {
      level: alert.level || 'info',
      message: alert.message,
      accountId
    }
  };

  if (userId) {
    emitToUser(userId, 'system_alert', payload);
  }
  if (accountId) {
    emitToAccount(accountId, 'system_alert', payload);
  }
};

const getConnectedUsers = () => {
  return Array.from(userConnections.keys());
};

const getUserSocketCount = (userId) => {
  const userSockets = userConnections.get(userId);
  return userSockets ? userSockets.size : 0;
};

const getTotalConnections = () => {
  return io.engine.clientsCount;
};

const disconnectUser = (userId) => {
  try {
    const userSockets = userConnections.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        io.sockets.sockets.get(socketId)?.disconnect();
      });
      userConnections.delete(userId);
      console.log(`🔌 Disconnected user ${userId}`);
    }
  } catch (error) {
    console.error(`❌ Error disconnecting user ${userId}:`, error);
  }
};

module.exports = {
  initializeWebSocket,
  emitToUser,
  emitToAccount,
  emitToAll,
  emitIPBlocked,
  emitFraudDetected,
  emitClickProcessed,
  emitSystemAlert,
  getConnectedUsers,
  getUserSocketCount,
  getTotalConnections,
  disconnectUser
}; 
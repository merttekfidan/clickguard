// In-memory storage for development without database
const inMemoryStorage = {
  users: new Map(),
  connectedAccounts: new Map(),
  clickLogs: new Map(),
  blockedIPs: new Map(),
  nextIds: {
    users: 1,
    connectedAccounts: 1,
    clickLogs: 1,
    blockedIPs: 1
  }
};

const initializeDatabase = async () => {
  try {
    console.log('✅ In-memory storage initialized successfully.');
    return inMemoryStorage;
  } catch (error) {
    console.error('❌ In-memory storage initialization failed:', error);
    throw error;
  }
};

const getStorage = () => {
  return inMemoryStorage;
};

const syncModels = async () => {
  try {
    // Import models after storage is initialized
    require('../models/User');
    require('../models/ConnectedAccount');
    require('../models/ClickLog');
    require('../models/BlockedIP');

    console.log('✅ In-memory models synchronized.');
  } catch (error) {
    console.error('❌ Failed to sync models:', error);
    throw error;
  }
};

module.exports = {
  initializeDatabase,
  getStorage,
  syncModels
}; 
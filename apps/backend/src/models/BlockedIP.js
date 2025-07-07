const mongoose = require('../config/mongo');

const BlockedIPSchema = new mongoose.Schema({
  ip: { type: String, required: true, index: true }, // Can be IP or subnet
  reason: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }, // Optional: for temporary blocks
});

module.exports = mongoose.model('BlockedIP', BlockedIPSchema); 
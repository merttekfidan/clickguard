const mongoose = require('../config/mongo');

const ClickLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  sessionId: String,
  ipAddress: String,
  deviceFingerprint: String,
  fingerprintCount: Number,
  isGoogleAds: Boolean,
  decision: String,
  reason: String,
  block_type: String,
  blocked_entry: String,
  honeypot: String,
  pow: Object,
  method: String,
  url: String,
  query: String,
  gclid: String,
  gclsrc: String,
  utm_source: String,
  utm_medium: String,
  utm_campaign: String,
  utm_term: String,
  utm_content: String,
  referrer: String,
  domain: String,
});

module.exports = mongoose.model('ClickLog', ClickLogSchema); 
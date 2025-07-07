const ruleEngine = require('./ruleEngine.service');
const crypto = require('crypto');
const clickProcessor = require('../workers/clickProcessor.worker');
const fetch = require('node-fetch');

// In-memory stores
const fingerprintCounts = {};
const subnetFraudCounts = {};
const googleAdsClickCounts = {};
const recentClicks = []; // Store recent clicks for API access
const MAX_RECENT_CLICKS = 100; // Keep last 100 clicks

// Google Ads tracking
const googleAdsStats = {
    totalClicks: 0,
    blockedClicks: 0,
    allowedClicks: 0,
    uniqueDevices: new Set(),
    uniqueIPs: new Set(),
    clickIds: new Map() // Track click IDs and their frequency
};

function getDeviceFingerprint(rawData) {
    // Combine key signals for fingerprinting
    const str = [
        rawData.userAgent,
        rawData.language,
        rawData.timezone,
        rawData.screenResolution && rawData.screenResolution.width,
        rawData.screenResolution && rawData.screenResolution.height,
        rawData.canvasFingerprint
    ].join('|');
    return crypto.createHash('sha256').update(str).digest('hex');
}

function getSubnet(ip) {
    // Only handle IPv4 for now
    if (!ip || !ip.includes('.')) return null;
    return ip.split('.').slice(0, 2).join('.') + '.0.0/16';
}

function isGoogleAdsClick(enrichedClick) {
    const ref = (enrichedClick.referrer || '').toLowerCase();
    const query = (enrichedClick.query || '').toLowerCase();
    const url = (enrichedClick.url || '').toLowerCase();
    const domain = (enrichedClick.domain || '').toLowerCase();
    
    // Check referrer patterns
    const googleReferrers = ['google.com', 'googleadservices.com', 'googlesyndication.com', 'doubleclick.net'];
    const hasGoogleReferrer = googleReferrers.some(pattern => ref.includes(pattern));
    
    // Check query parameters (gclid, etc.)
    const clickParams = ['gclid', 'gclsrc', 'dclid', 'fbclid', 'msclkid', 'ttclid'];
    const hasClickId = clickParams.some(param => query.includes(param + '=') || url.includes(param + '='));
    
    // Check domain patterns
    const googleDomains = ['google.com', 'googleadservices.com', 'googlesyndication.com'];
    const hasGoogleDomain = googleDomains.some(pattern => domain.includes(pattern));
    
    return hasGoogleReferrer || hasClickId || hasGoogleDomain;
}

function extractClickId(enrichedClick) {
    const query = (enrichedClick.query || '').toLowerCase();
    const url = (enrichedClick.url || '').toLowerCase();
    
    const clickParams = ['gclid', 'gclsrc', 'dclid', 'fbclid', 'msclkid', 'ttclid'];
    for (const param of clickParams) {
        const pattern = new RegExp(`${param}=([^&]+)`, 'i');
        const match = query.match(pattern) || url.match(pattern);
        if (match) {
            return { type: param, value: match[1] };
        }
    }
    
    return null;
}

function updateGoogleAdsStats(enrichedClick, result) {
    if (isGoogleAdsClick(enrichedClick)) {
        googleAdsStats.totalClicks++;
        googleAdsStats.uniqueDevices.add(enrichedClick.deviceFingerprint);
        googleAdsStats.uniqueIPs.add(enrichedClick.ipAddress);
        
        if (result.decision === 'BLOCK') {
            googleAdsStats.blockedClicks++;
        } else {
            googleAdsStats.allowedClicks++;
        }
        
        const clickId = extractClickId(enrichedClick);
        if (clickId) {
            const key = `${clickId.type}:${clickId.value}`;
            googleAdsStats.clickIds.set(key, (googleAdsStats.clickIds.get(key) || 0) + 1);
        }
    }
}

function colorText(text, color) {
    const colors = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', reset: '\x1b[0m' };
    return colors[color] + text + colors.reset;
}

function getBlockReason(result, enrichedClick, contextData) {
    switch (result.reason) {
        case 'ALLOWED_ISP':
            return `Allowed: IP is from allowed ISP (${enrichedClick.ipInfo?.isp || 'unknown'}).`;
        case 'NOT_ALLOWED_ISP':
            return `Blocked: IP not in allowed ISP list (${enrichedClick.ipInfo?.isp || 'unknown'}).`;
        case 'LOCAL_DEVELOPMENT':
            return `Allowed: Local development IP.`;
        case 'HIGH_FREQUENCY_NO_ISP':
            return `Blocked: High frequency detected (${result.details?.clickCount || 0} clicks in 5 minutes) - ISP info unavailable.`;
        case 'FREQUENCY_OK_NO_ISP':
            return `Allowed: Frequency OK (${result.details?.clickCount || 0} clicks in 5 minutes) - ISP info unavailable.`;
        case 'FRAUD_IP_TYPE':
            return `Blocked: IP (${enrichedClick.ipAddress}) is from a cloud/hosting provider.`;
        case 'FRAUD_DEVICE_FREQUENCY':
            return `Blocked: Device fingerprint (${contextData.fingerprintCount} times).`;
        case 'FRAUD_CIDR_RANGE':
            return `Blocked: Subnet (${contextData.subnet}) has too many frauds (${contextData.subnetFraudCount + 1}).`;
        case 'FRAUD_GOOGLE_ADS_FREQUENCY':
            return `Blocked: Google Ads device (${contextData.googleAdsClickCount} times).`;
        case 'FRAUD_GOOGLE_ADS_SUSPICIOUS':
            return `Blocked: Suspicious Google Ads pattern detected (${result.details?.clickId?.type || 'unknown'}).`;
        case 'DATA_CENTER_DETECTED':
            return `Blocked: Data Center Detected.`;
        case 'VPN_DETECTED':
            return `Blocked: VPN Detected.`;
        case 'HIGH_FREQUENCY':
            return `Blocked: High Frequency.`;
        default:
            return `Blocked: Reason=${result.reason}`;
    }
}

function storeRecentClick(enrichedClick, result, contextData) {
    const isBlocked = result.decision === 'BLOCK';
    const ipType = enrichedClick.ipInfo && enrichedClick.ipInfo.type ? enrichedClick.ipInfo.type : null;
    let blockedEntry = null;
    let blockType = null;
    if (isBlocked) {
        // If result.target is a CIDR, treat as block type IP_BLOCK, else IP_ADDRESS
        if (result.target && typeof result.target === 'string' && result.target.includes('/')) {
            blockedEntry = result.target;
            blockType = 'IP_BLOCK';
        } else {
            blockedEntry = enrichedClick.ipAddress;
            blockType = 'IP_ADDRESS';
        }
    }
    const clickRecord = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        sessionId: enrichedClick.sessionId,
        ipAddress: enrichedClick.ipAddress,
        domain: enrichedClick.domain,
        path: enrichedClick.path,
        decision: result.decision,
        reason: result.reason,
        deviceFingerprint: enrichedClick.deviceFingerprint,
        fingerprintCount: contextData.fingerprintCount,
        googleAdsClickCount: contextData.googleAdsClickCount,
        isGoogleAds: isGoogleAdsClick(enrichedClick),
        clickId: extractClickId(enrichedClick),
        // Basic info
        userAgent: enrichedClick.userAgent,
        language: enrichedClick.language,
        timezone: enrichedClick.timezone,
        screenResolution: enrichedClick.screenResolution,
        // IP info
        ipInfo: enrichedClick.ipInfo,
        ip_type: ipType, // New field for ClickLogs
        // Block info (only for blocked clicks)
        blocked_entry: blockedEntry, // New field for BlockedIPs
        block_type: blockType, // New field for BlockedIPs
        // Page info
        url: enrichedClick.url,
        referrer: enrichedClick.referrer,
        query: enrichedClick.query,
        // Additional details
        details: result.details || null
    };
    recentClicks.unshift(clickRecord); // Add to beginning
    if (recentClicks.length > MAX_RECENT_CLICKS) {
        recentClicks.pop(); // Remove oldest
    }
}

function getRecentClicks(limit = 20, filter = null) {
    let clicks = [...recentClicks];
    
    if (filter) {
        if (filter.decision) {
            clicks = clicks.filter(click => click.decision === filter.decision);
        }
        if (filter.domain) {
            clicks = clicks.filter(click => click.domain === filter.domain);
        }
        if (filter.ipAddress) {
            clicks = clicks.filter(click => click.ipAddress === filter.ipAddress);
        }
        if (filter.isGoogleAds) {
            clicks = clicks.filter(click => click.isGoogleAds === true);
        }
    }
    
    return clicks.slice(0, limit);
}

function getClickById(clickId) {
    return recentClicks.find(click => click.id === clickId);
}

function getGoogleAdsStats() {
    return {
        ...googleAdsStats,
        uniqueDevices: googleAdsStats.uniqueDevices.size,
        uniqueIPs: googleAdsStats.uniqueIPs.size,
        clickIds: Object.fromEntries(googleAdsStats.clickIds),
        blockRate: googleAdsStats.totalClicks > 0 ? (googleAdsStats.blockedClicks / googleAdsStats.totalClicks * 100).toFixed(2) + '%' : '0%'
    };
}

/**
 * Enrich click data with IP geolocation/ISP info using ip-api.com
 */
async function enrichIpInfo(ipAddress) {
  if (!ipAddress) return null;
  try {
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
    const data = await response.json();
    if (data.status === 'fail') {
      console.warn(`ip-api.com failed for ${ipAddress}:`, data.message, data);
    }
    return data;
  } catch (error) {
    console.warn('IP enrichment failed:', error.message);
    return { status: 'fail', message: error.message };
  }
}

async function processClick(rawData, customerId = null, campaignId = null) {
    // Enrich IP info if not present
    if (!rawData.ipInfo && rawData.ipAddress) {
        rawData.ipInfo = await enrichIpInfo(rawData.ipAddress);
    }
    // Use the new worker for processing
    const logEntry = await clickProcessor.processClick(rawData, customerId, campaignId);
    
    // Add error handling for IP API failures
    if (logEntry && logEntry.click && logEntry.click.ipInfo) {
        const ipInfo = logEntry.click.ipInfo;
        if (ipInfo.status === 'fail' || !ipInfo.isp) {
            console.warn(`⚠️ IP API Error for ${rawData.ipAddress}:`, {
                status: ipInfo.status,
                message: ipInfo.message,
                isp: ipInfo.isp,
                org: ipInfo.org,
                note: 'Client allowed despite API failure'
            });
        }
    }
    
    // For backward compatibility, store in recentClicks
    if (logEntry && logEntry.click) {
        recentClicks.unshift({
            ...logEntry.click,
            timestamp: logEntry.timestamp,
            decision: logEntry.decision.decision,
            reason: logEntry.decision.reason,
            block_type: logEntry.decision.blockType || null,
            blocked_entry: logEntry.decision.target || null
        });
        if (recentClicks.length > MAX_RECENT_CLICKS) recentClicks.pop();
    }
    return logEntry;
}

module.exports = { 
    processClick, 
    getRecentClicks, 
    getClickById,
    getGoogleAdsStats
}; 
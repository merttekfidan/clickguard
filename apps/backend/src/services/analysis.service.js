const ruleEngine = require('./ruleEngine.service');
const crypto = require('crypto');

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
        case 'FRAUD_IP_TYPE':
            return `Blocked: IP (${enrichedClick.ipAddress}) is from a cloud/hosting provider.`;
        case 'FRAUD_DEVICE_FREQUENCY':
            return `Blocked: Device fingerprint (${enrichedClick.deviceFingerprint.slice(0,8)}) seen too frequently (${contextData.fingerprintCount} times).`;
        case 'FRAUD_CIDR_RANGE':
            return `Blocked: Subnet (${contextData.subnet}) has too many frauds (${contextData.subnetFraudCount + 1}).`;
        case 'FRAUD_GOOGLE_ADS_FREQUENCY':
            return `Blocked: Google Ads device (${enrichedClick.deviceFingerprint.slice(0,8)}) clicked too frequently (${contextData.googleAdsClickCount} times).`;
        case 'FRAUD_GOOGLE_ADS_SUSPICIOUS':
            return `Blocked: Suspicious Google Ads pattern detected (${result.details?.clickId?.type || 'unknown'}).`;
        default:
            return `Blocked: Reason=${result.reason}`;
    }
}

function storeRecentClick(enrichedClick, result, contextData) {
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

async function processClick(rawData) {
    let ipInfo = null;
    try {
        const ip = rawData.ipAddress || rawData.ip || '';
        if (ip) {
            const res = await fetch(`http://ip-api.com/json/${ip}`);
            ipInfo = await res.json();
        }
    } catch (err) {
        ipInfo = { status: 'fail', message: err.message };
    }
    const deviceFingerprint = getDeviceFingerprint(rawData);
    fingerprintCounts[deviceFingerprint] = (fingerprintCounts[deviceFingerprint] || 0) + 1;
    const enrichedClick = {
        ...rawData,
        ipInfo,
        deviceFingerprint
    };
    
    // Google Ads click counting and analysis
    const isGoogleAds = isGoogleAdsClick(enrichedClick);
    const clickId = extractClickId(enrichedClick);
    
    if (isGoogleAds) {
        googleAdsClickCounts[deviceFingerprint] = (googleAdsClickCounts[deviceFingerprint] || 0) + 1;
        console.log(colorText(`[GOOGLE ADS] fingerprint=${deviceFingerprint.slice(0,8)} count=${googleAdsClickCounts[deviceFingerprint]} clickId=${clickId?.type || 'none'}`, 'magenta'));
    }
    
    const subnet = getSubnet(rawData.ipAddress);
    const contextData = {
        fingerprintCount: fingerprintCounts[deviceFingerprint],
        subnet,
        subnetFraudCount: subnet ? (subnetFraudCounts[subnet] || 0) : 0,
        googleAdsClickCount: googleAdsClickCounts[deviceFingerprint] || 0
    };
    
    const result = ruleEngine.runRules(enrichedClick, contextData);
    
    // Update Google Ads statistics
    updateGoogleAdsStats(enrichedClick, result);
    
    if (result.decision === 'BLOCK' && subnet) {
        subnetFraudCounts[subnet] = (subnetFraudCounts[subnet] || 0) + 1;
    }
    
    // Store click for API access
    storeRecentClick(enrichedClick, result, contextData);
    
    // Concise summary log with color
    const color = result.decision === 'BLOCK' ? 'red' : 'green';
    const googleAdsIndicator = isGoogleAds ? colorText(' [GOOGLE ADS]', 'magenta') : '';
    const clickIdIndicator = clickId ? colorText(` [${clickId.type}]`, 'yellow') : '';
    const summary = `[${colorText(result.decision, color)}] session=${enrichedClick.sessionId} ip=${enrichedClick.ipAddress} domain=${enrichedClick.domain} url=${enrichedClick.path} reason=${result.reason}${googleAdsIndicator}${clickIdIndicator}`;
    console.log(summary);
    
    // Enhanced click details logging
    if (result.decision === 'BLOCK' || result.decision === 'ALLOW') {
        const logColor = result.decision === 'BLOCK' ? 'red' : 'green';
        console.warn(colorText(`\n=== ${result.decision} CLICK DETAILS ===`, logColor));
        
        // Basic click information
        console.warn(colorText('📊 Basic Info:', 'blue'));
        console.warn({
            sessionId: enrichedClick.sessionId,
            timestamp: enrichedClick.timestamp,
            serverTimestamp: enrichedClick.serverTimestamp,
            decision: result.decision,
            reason: result.reason,
            isGoogleAds,
            clickId
        });
        
        // IP and location information
        console.warn(colorText('🌍 IP & Location:', 'blue'));
        const { ipAddress } = enrichedClick;
        const { proxy, hosting, mobile, isp, org, country, regionName, city, query, timezone: ipTimezone } = ipInfo || {};
        console.warn({
            ipAddress,
            ipInfo: { 
                isp, 
                org, 
                country, 
                regionName, 
                city, 
                query, 
                proxy, 
                hosting, 
                mobile,
                timezone: ipTimezone
            }
        });
        
        // Device fingerprinting
        console.warn(colorText('🖥️ Device Fingerprint:', 'blue'));
        console.warn({
            deviceFingerprint: enrichedClick.deviceFingerprint,
            fingerprintCount: contextData.fingerprintCount,
            googleAdsClickCount: contextData.googleAdsClickCount,
            subnet: contextData.subnet,
            subnetFraudCount: contextData.subnetFraudCount
        });
        
        // Browser and device information
        console.warn(colorText('🌐 Browser & Device:', 'blue'));
        console.warn({
            userAgent: enrichedClick.userAgent,
            language: enrichedClick.language,
            timezone: enrichedClick.timezone,
            screenResolution: enrichedClick.screenResolution,
            viewport: enrichedClick.viewport,
            canvasFingerprint: enrichedClick.canvasFingerprint?.slice(0, 16) + '...'
        });
        
        // Page and navigation information
        console.warn(colorText('📄 Page Info:', 'blue'));
        console.warn({
            url: enrichedClick.url,
            domain: enrichedClick.domain,
            path: enrichedClick.path,
            query: enrichedClick.query,
            hash: enrichedClick.hash,
            referrer: enrichedClick.referrer
        });
        
        // Headers and server information
        console.warn(colorText('🔧 Server Info:', 'blue'));
        console.warn({
            acceptLanguage: enrichedClick.acceptLanguage,
            headers: enrichedClick.headers
        });
        
        // Additional details from rule engine
        if (result.details) {
            console.warn(colorText('🔍 Rule Details:', 'blue'));
            console.warn(result.details);
        }
        
        console.warn(colorText('=== END CLICK DETAILS ===\n', logColor));
    }
    
    return { enrichedClick, result };
}

module.exports = { 
    processClick, 
    getRecentClicks, 
    getClickById,
    getGoogleAdsStats
}; 
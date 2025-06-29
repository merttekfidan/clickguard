const ruleEngine = require('./ruleEngine.service');
const crypto = require('crypto');

// In-memory stores
const fingerprintCounts = {};
const subnetFraudCounts = {};
const googleAdsClickCounts = {};
const recentClicks = []; // Store recent clicks for API access
const MAX_RECENT_CLICKS = 100; // Keep last 100 clicks

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
    return ref.includes('google.com') || ref.includes('googleadservices.com') || query.includes('gclid=');
}

function colorText(text, color) {
    const colors = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', reset: '\x1b[0m' };
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
        query: enrichedClick.query
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
    }
    
    return clicks.slice(0, limit);
}

function getClickById(clickId) {
    return recentClicks.find(click => click.id === clickId);
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
    // Google Ads click counting
    if (isGoogleAdsClick(enrichedClick)) {
        googleAdsClickCounts[deviceFingerprint] = (googleAdsClickCounts[deviceFingerprint] || 0) + 1;
        console.log(`[GOOGLE ADS] fingerprint=${deviceFingerprint.slice(0,8)} count=${googleAdsClickCounts[deviceFingerprint]}`);
    }
    const subnet = getSubnet(rawData.ipAddress);
    const contextData = {
        fingerprintCount: fingerprintCounts[deviceFingerprint],
        subnet,
        subnetFraudCount: subnet ? (subnetFraudCounts[subnet] || 0) : 0,
        googleAdsClickCount: googleAdsClickCounts[deviceFingerprint] || 0
    };
    const result = ruleEngine.runRules(enrichedClick, contextData);
    if (result.decision === 'BLOCK' && subnet) {
        subnetFraudCounts[subnet] = (subnetFraudCounts[subnet] || 0) + 1;
    }
    
    // Store click for API access
    storeRecentClick(enrichedClick, result, contextData);
    
    // Concise summary log with color
    const color = result.decision === 'BLOCK' ? 'red' : 'green';
    const summary = `[${colorText(result.decision, color)}] session=${enrichedClick.sessionId} ip=${enrichedClick.ipAddress} domain=${enrichedClick.domain} url=${enrichedClick.path} reason=${result.reason}`;
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
            reason: result.reason
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
        
        console.warn(colorText('=== END CLICK DETAILS ===\n', logColor));
    }
    
    return { enrichedClick, result };
}

module.exports = { 
    processClick, 
    getRecentClicks, 
    getClickById 
}; 
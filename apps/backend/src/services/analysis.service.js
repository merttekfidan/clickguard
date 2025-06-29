const ruleEngine = require('./ruleEngine.service');
const crypto = require('crypto');

// In-memory stores
const fingerprintCounts = {};
const subnetFraudCounts = {};
const googleAdsClickCounts = {};

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
    const colors = { red: '\x1b[31m', green: '\x1b[32m', reset: '\x1b[0m' };
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
    // Concise summary log with color
    const color = result.decision === 'BLOCK' ? 'red' : 'green';
    const summary = `[${colorText(result.decision, color)}] session=${enrichedClick.sessionId} ip=${enrichedClick.ipAddress} domain=${enrichedClick.domain} url=${enrichedClick.path} reason=${result.reason}`;
    console.log(summary);
    // Only log details if BLOCKED or (temporarily) if ALLOWED (for debugging)
    if (result.decision === 'BLOCK' || result.decision === 'ALLOW') {
        // Only show ipAddress, ipInfo, block reason, and proxy/hosting fields
        const { ipAddress } = enrichedClick;
        const { proxy, hosting, mobile, isp, org, country, regionName, city, query } = ipInfo || {};
        const details = {
            ipAddress,
            ipInfo: { isp, org, country, regionName, city, query, proxy, hosting, mobile },
            reason: result.reason
        };
        const logColor = result.decision === 'BLOCK' ? 'red' : 'green';
        console.warn(colorText(`${result.decision} click details:`, logColor), details);
    }
    return { enrichedClick, result };
}

module.exports = { processClick }; 
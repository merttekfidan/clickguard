const fs = require('fs');
const path = require('path');

// Load allowed ISP/org keywords from JSON (now an allowlist)
const allowedKeywords = JSON.parse(fs.readFileSync(path.join(__dirname, 'cloud_keywords.json'), 'utf8'));

// New allowlist: exact match, case-insensitive
const allowedISPs = [
  "Orange Polska S.A.",
  "P4 Sp. z o.o.",
  "T-Mobile Polska S.A.",
  "Polkomtel Sp. z o.o.",
  "Vectra S.A.",
  "Inea S.A.",
  "Toya Sp. z o.o.",
  "Netia S.A."
];

function isLocalDevelopmentIP(ipAddress) {
  if (!ipAddress) return false;
  
  // Check for localhost IPv4 and IPv6
  if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress === 'localhost') {
    return true;
  }
  
  // Check for local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  const localIPPatterns = [
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./
  ];
  
  return localIPPatterns.some(pattern => pattern.test(ipAddress));
}

function isAllowedISP(ipInfo) {
  if (!ipInfo || ipInfo.status !== "success") return false;
  const isp = (ipInfo.isp || "").toLowerCase();
  const org = (ipInfo.org || "").toLowerCase();
  return allowedISPs.some(allowed =>
    isp.includes(allowed.toLowerCase()) || org.includes(allowed.toLowerCase())
  );
}

// Example Google Ads link for debug:
// https://your-ngrok-url/test-tracker.html?gclid=EAIaIQobChMI0b2

function isGoogleAdsClick(enrichedClick) {
    const ref = (enrichedClick.referrer || '').toLowerCase();
    const query = (enrichedClick.query || '').toLowerCase();
    return ref.includes('google.com') || ref.includes('googleadservices.com') || query.includes('gclid=');
}

function runRules(enrichedClick, contextData) {
    // Rule #0: Allow local development IPs
    const ipAddress = enrichedClick.ipAddress;
    if (isLocalDevelopmentIP(ipAddress)) {
        console.debug('Rule #0: Local development IP detected, allowing', { ipAddress });
        return {
            decision: 'ALLOW',
            reason: 'LOCAL_DEVELOPMENT'
        };
    }

    // Rule #1: IP Type Analysis (Allowlist)
    const ipInfo = enrichedClick.ipInfo;
    const isp = (ipInfo && ipInfo.isp) || '';
    const org = (ipInfo && ipInfo.org) || '';
    console.debug('Rule #1: IP Type Analysis (Allowlist)', { isp, org });
    if (!isAllowedISP(ipInfo)) {
        console.debug('Rule #1 triggered: BLOCK (not in allowlist)', { isp, org });
        return {
            decision: 'BLOCK',
            reason: 'FRAUD_IP_TYPE_NOT_ALLOWED',
            target: enrichedClick.ipAddress
        };
    }

    // Rule #2: Device Frequency Analysis (Google Ads only)
    if (isGoogleAdsClick(enrichedClick)) {
        const googleAdsCount = contextData.googleAdsClickCount || 0;
        console.debug('Rule #2: Google Ads Device Frequency Analysis', { googleAdsCount });
        if (googleAdsCount > 3) {
            console.debug('Rule #2 triggered: BLOCK (Google Ads repeated clicks)', { fingerprint: enrichedClick.deviceFingerprint, googleAdsCount });
            return {
                decision: 'BLOCK',
                reason: 'FRAUD_GOOGLE_ADS_FREQUENCY',
                target: enrichedClick.deviceFingerprint
            };
        }
    } else {
        // For non-Google Ads clicks, always allow (no device frequency block)
        console.debug('Rule #2: Skipped for non-Google Ads click');
    }

    // Rule #3: CIDR Range Analysis
    const subnetFraudCount = contextData.subnetFraudCount || 0;
    console.debug('Rule #3: CIDR Range Analysis', { subnet: contextData.subnet, subnetFraudCount });
    if (subnetFraudCount > 2) {
        console.debug('Rule #3 triggered: BLOCK', { subnet: contextData.subnet, subnetFraudCount });
        return {
            decision: 'BLOCK',
            reason: 'FRAUD_CIDR_RANGE',
            target: contextData.subnet
        };
    }

    // Default: Allow
    console.debug('No rules triggered: ALLOW');
    return {
        decision: 'ALLOW',
        reason: 'OK'
    };
}

module.exports = { runRules }; 
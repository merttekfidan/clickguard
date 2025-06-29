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

// Google Ads detection patterns
const GOOGLE_ADS_PATTERNS = {
  referrers: [
    'google.com',
    'googleadservices.com',
    'googlesyndication.com',
    'doubleclick.net',
    'google-analytics.com'
  ],
  queryParams: [
    'gclid',      // Google Click ID
    'gclsrc',     // Google Click Source
    'dclid',      // Display Click ID
    'fbclid',     // Facebook Click ID
    'msclkid',    // Microsoft Click ID
    'ttclid'      // TikTok Click ID
  ],
  domains: [
    'google.com',
    'googleadservices.com',
    'googlesyndication.com'
  ]
};

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
    const url = (enrichedClick.url || '').toLowerCase();
    const domain = (enrichedClick.domain || '').toLowerCase();
    
    // Check referrer patterns
    const hasGoogleReferrer = GOOGLE_ADS_PATTERNS.referrers.some(pattern => 
        ref.includes(pattern)
    );
    
    // Check query parameters (gclid, etc.)
    const hasClickId = GOOGLE_ADS_PATTERNS.queryParams.some(param => 
        query.includes(param + '=') || url.includes(param + '=')
    );
    
    // Check domain patterns
    const hasGoogleDomain = GOOGLE_ADS_PATTERNS.domains.some(pattern => 
        domain.includes(pattern)
    );
    
    return hasGoogleReferrer || hasClickId || hasGoogleDomain;
}

function extractClickId(enrichedClick) {
    const query = (enrichedClick.query || '').toLowerCase();
    const url = (enrichedClick.url || '').toLowerCase();
    
    for (const param of GOOGLE_ADS_PATTERNS.queryParams) {
        const pattern = new RegExp(`${param}=([^&]+)`, 'i');
        const match = query.match(pattern) || url.match(pattern);
        if (match) {
            return { type: param, value: match[1] };
        }
    }
    
    return null;
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

    // Rule #2: Google Ads Click Analysis (Enhanced)
    if (isGoogleAdsClick(enrichedClick)) {
        const clickId = extractClickId(enrichedClick);
        const googleAdsCount = contextData.googleAdsClickCount || 0;
        const fingerprintCount = contextData.fingerprintCount || 0;
        
        console.debug('Rule #2: Google Ads Click Analysis', { 
            googleAdsCount, 
            fingerprintCount, 
            clickId,
            referrer: enrichedClick.referrer,
            query: enrichedClick.query
        });
        
        // Stricter rules for Google Ads clicks
        if (googleAdsCount > 2) { // Reduced threshold from 3 to 2
            console.debug('Rule #2a triggered: BLOCK (Google Ads repeated clicks)', { 
                fingerprint: enrichedClick.deviceFingerprint, 
                googleAdsCount 
            });
            return {
                decision: 'BLOCK',
                reason: 'FRAUD_GOOGLE_ADS_FREQUENCY',
                target: enrichedClick.deviceFingerprint,
                details: { googleAdsCount, clickId }
            };
        }
        
        // Block if same device has too many total clicks (even if not all are Google Ads)
        if (fingerprintCount > 5) {
            console.debug('Rule #2b triggered: BLOCK (High device frequency)', { 
                fingerprint: enrichedClick.deviceFingerprint, 
                fingerprintCount 
            });
            return {
                decision: 'BLOCK',
                reason: 'FRAUD_DEVICE_FREQUENCY',
                target: enrichedClick.deviceFingerprint,
                details: { fingerprintCount, googleAdsCount, clickId }
            };
        }
        
        // Block suspicious Google Ads patterns
        if (clickId && (googleAdsCount > 1 || fingerprintCount > 3)) {
            console.debug('Rule #2c triggered: BLOCK (Suspicious Google Ads pattern)', { 
                clickId, 
                googleAdsCount, 
                fingerprintCount 
            });
            return {
                decision: 'BLOCK',
                reason: 'FRAUD_GOOGLE_ADS_SUSPICIOUS',
                target: enrichedClick.deviceFingerprint,
                details: { clickId, googleAdsCount, fingerprintCount }
            };
        }
        
        console.debug('Rule #2: Google Ads click allowed', { googleAdsCount, fingerprintCount, clickId });
    } else {
        // For non-Google Ads clicks, apply standard frequency rules
        const fingerprintCount = contextData.fingerprintCount || 0;
        if (fingerprintCount > 10) { // Higher threshold for non-Google Ads
            console.debug('Rule #2d triggered: BLOCK (High non-Google Ads frequency)', { 
                fingerprint: enrichedClick.deviceFingerprint, 
                fingerprintCount 
            });
            return {
                decision: 'BLOCK',
                reason: 'FRAUD_DEVICE_FREQUENCY',
                target: enrichedClick.deviceFingerprint,
                details: { fingerprintCount }
            };
        }
        console.debug('Rule #2: Non-Google Ads click allowed', { fingerprintCount });
    }

    // Rule #3: CIDR Range Analysis (Enhanced for Google Ads)
    const subnetFraudCount = contextData.subnetFraudCount || 0;
    const isGoogleAds = isGoogleAdsClick(enrichedClick);
    const subnetThreshold = isGoogleAds ? 1 : 2; // Lower threshold for Google Ads
    
    console.debug('Rule #3: CIDR Range Analysis', { 
        subnet: contextData.subnet, 
        subnetFraudCount, 
        isGoogleAds, 
        threshold: subnetThreshold 
    });
    
    if (subnetFraudCount >= subnetThreshold) {
        console.debug('Rule #3 triggered: BLOCK', { 
            subnet: contextData.subnet, 
            subnetFraudCount, 
            threshold: subnetThreshold 
        });
        return {
            decision: 'BLOCK',
            reason: 'FRAUD_CIDR_RANGE',
            target: contextData.subnet,
            details: { subnetFraudCount, threshold: subnetThreshold, isGoogleAds }
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
const fs = require('fs');
const path = require('path');

// Load allowed ISP/org keywords from JSON (now an allowlist)
const allowedKeywords = JSON.parse(fs.readFileSync(path.join(__dirname, 'cloud_keywords.json'), 'utf8'));

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
  if (!ipInfo || ipInfo.status !== "success") return true; // Allow if API call failed
  const isp = (ipInfo.isp || "").toLowerCase();
  const org = (ipInfo.org || "").toLowerCase();
  
  // If both isp and org are undefined/empty, allow the IP
  if (!isp && !org) return true;
  
  // Use the existing allowlist from cloud_keywords.json
  return allowedKeywords.some(keyword =>
    isp.includes(keyword.toLowerCase()) || org.includes(keyword.toLowerCase())
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
  const hasGoogleReferrer = GOOGLE_ADS_PATTERNS.referrers.some(pattern => ref.includes(pattern));
  // Check query parameters (gclid, etc.)
  const hasClickId = GOOGLE_ADS_PATTERNS.queryParams.some(param => query.includes(param + '=') || url.includes(param + '='));
  // Check domain patterns
  const hasGoogleDomain = GOOGLE_ADS_PATTERNS.domains.some(pattern => domain.includes(pattern));
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

function getSubnet(ip, mask) {
  if (!ip || !ip.includes('.')) return null;
  const parts = ip.split('.');
  if (mask === 16) return parts.slice(0, 2).join('.') + '.0.0/16';
  if (mask === 24) return parts.slice(0, 3).join('.') + '.0/24';
  return ip + '/32';
}

function getFingerprintIpPattern(deviceFingerprint) {
  // Find all recent clicks for this fingerprint in the last 5 minutes
  const recentClicks = (global.recentClicks || []).filter(click =>
    click.deviceFingerprint === deviceFingerprint &&
    Date.now() - new Date(click.timestamp).getTime() < 5 * 60 * 1000
  );
  const ips = recentClicks.map(click => click.ipAddress).filter(Boolean);
  if (ips.length === 0) return { pattern: 'none', ip: null };
  // Check if all IPs are the same
  const uniqueIps = [...new Set(ips)];
  if (uniqueIps.length === 1) return { pattern: 'same', ip: uniqueIps[0] };
  // Check if all IPs share the same first 3 octets (block /24)
  const first3 = ips.map(ip => ip.split('.').slice(0, 3).join('.')).filter(Boolean);
  if (new Set(first3).size === 1) return { pattern: 'same24', ip: first3[0] };
  // Check if all IPs share the same first 2 octets (block /16)
  const first2 = ips.map(ip => ip.split('.').slice(0, 2).join('.')).filter(Boolean);
  if (new Set(first2).size === 1) return { pattern: 'same16', ip: first2[0] };
  return { pattern: 'mixed', ip: null };
}

function runRules(enrichedClick, contextData) {
  const ipAddress = enrichedClick.ipAddress;
  const ipInfo = enrichedClick.ipInfo || {};
  const subnet = contextData.subnet;
  const deviceFingerprint = enrichedClick.deviceFingerprint;
  const fingerprintCount = contextData.fingerprintCount || 0;
  const isGoogleAds = isGoogleAdsClick(enrichedClick);

  // Rule #0: Allow local development IPs (DISABLED FOR PRODUCTION)
  // if (isLocalDevelopmentIP(ipAddress)) {
  //   console.debug('Rule #0: Local development IP detected, allowing', { ipAddress });
  //   return {
  //     decision: 'ALLOW',
  //     reason: 'LOCAL_DEVELOPMENT'
  //   };
  // }

  // Rule #1: Device fingerprint frequency logic for Google Ads clicks only
  if (isGoogleAds && fingerprintCount > 10) {
    const patternInfo = getFingerprintIpPattern(deviceFingerprint);
    if (patternInfo.pattern === 'same') {
      // All clicks from same IP: block only that IP
      console.log('🚨 Device fingerprint abuse: same IP, blocking /32', {
        ipAddress,
        deviceFingerprint: deviceFingerprint?.slice(0, 8),
        fingerprintCount,
        block: ipAddress + '/32'
      });
      return {
        decision: 'BLOCK',
        reason: 'FRAUD_DEVICE_FREQUENCY',
        blockType: '/32',
        target: ipAddress,
        details: { ipAddress, deviceFingerprint: deviceFingerprint?.slice(0, 8), fingerprintCount, block: ipAddress + '/32' }
      };
    } else if (patternInfo.pattern === 'same24') {
      // Same first 3 octets, last changes: block /24
      const subnet24 = getSubnet(ipAddress, 24);
      console.log('🚨 Device fingerprint abuse: /24 pattern, blocking /24', {
        ipAddress,
        deviceFingerprint: deviceFingerprint?.slice(0, 8),
        fingerprintCount,
        block: subnet24
      });
      return {
        decision: 'BLOCK',
        reason: 'FRAUD_DEVICE_FREQUENCY',
        blockType: '/24',
        target: subnet24,
        details: { ipAddress, deviceFingerprint: deviceFingerprint?.slice(0, 8), fingerprintCount, block: subnet24 }
      };
    } else if (patternInfo.pattern === 'same16') {
      // Same first 2 octets, last 2 change: block /16
      const subnet16 = getSubnet(ipAddress, 16);
      console.log('🚨 Device fingerprint abuse: /16 pattern, blocking /16', {
        ipAddress,
        deviceFingerprint: deviceFingerprint?.slice(0, 8),
        fingerprintCount,
        block: subnet16
      });
      return {
        decision: 'BLOCK',
        reason: 'FRAUD_DEVICE_FREQUENCY',
        blockType: '/16',
        target: subnet16,
        details: { ipAddress, deviceFingerprint: deviceFingerprint?.slice(0, 8), fingerprintCount, block: subnet16 }
      };
    } else {
      // Mixed pattern, fallback to blocking only IP
      console.log('🚨 Device fingerprint abuse: mixed pattern, blocking /32', {
        ipAddress,
        deviceFingerprint: deviceFingerprint?.slice(0, 8),
        fingerprintCount,
        block: ipAddress + '/32'
      });
      return {
        decision: 'BLOCK',
        reason: 'FRAUD_DEVICE_FREQUENCY',
        blockType: '/32',
        target: ipAddress,
        details: { ipAddress, deviceFingerprint: deviceFingerprint?.slice(0, 8), fingerprintCount, block: ipAddress + '/32' }
      };
    }
  } else if (isGoogleAds) {
    console.log('✅ Device fingerprint frequency OK (Google Ads):', { 
      ipAddress, 
      deviceFingerprint: deviceFingerprint?.slice(0, 8),
      fingerprintCount,
      threshold: 10
    });
  }

  // Rule #2: Check if IP is in allowed ISP list
  if (isAllowedISP(ipInfo)) {
    console.debug('Rule #2: IP is in allowed ISP list, allowing', { 
      ipAddress, 
      isp: ipInfo.isp, 
      org: ipInfo.org 
    });
    return {
      decision: 'ALLOW',
      reason: 'ALLOWED_ISP'
    };
  }

  // Rule #3: If ISP info is unavailable, check frequency
  if (!ipInfo.isp && !ipInfo.org) {
    console.debug('Rule #3: ISP info unavailable, checking frequency', { ipAddress });
    
    // Check recent clicks from this IP in the last 5 minutes
    const recentClicks = (global.recentClicks || []).filter(click =>
      click.ipAddress === ipAddress &&
      Date.now() - new Date(click.timestamp).getTime() < 5 * 60 * 1000
    );
    
    if (recentClicks.length > 3) { // Block if more than 3 clicks in 5 minutes (single IP only)
      console.debug('Rule #3: High frequency detected, blocking single IP', { 
        ipAddress, 
        clickCount: recentClicks.length
      });
      return {
        decision: 'BLOCK',
        reason: 'HIGH_FREQUENCY_NO_ISP',
        blockType: '/32',
        target: ipAddress,
        details: { ipAddress, clickCount: recentClicks.length }
      };
    }
    
    console.debug('Rule #3: Frequency OK, allowing', { ipAddress, clickCount: recentClicks.length });
    return {
      decision: 'ALLOW',
      reason: 'FREQUENCY_OK_NO_ISP'
    };
  }

  // Rule #4: Block everything else with /16 network blocking
  console.debug('Rule #4: IP not in allowlist, blocking /16', { 
    ipAddress, 
    isp: ipInfo.isp, 
    org: ipInfo.org, 
    subnet 
  });
  return {
    decision: 'BLOCK',
    reason: 'NOT_ALLOWED_ISP',
    blockType: '/16',
    target: subnet,
    details: { ipAddress, isp: ipInfo.isp, org: ipInfo.org, subnet }
  };
}

// Honeypot detection function
function detectHoneypot(enrichedClick) {
    // Check for honeypot indicators
    const honeypotIndicators = [];
    
    // 1. Check for hidden form fields or suspicious DOM elements
    if (enrichedClick.hiddenFields && enrichedClick.hiddenFields.length > 0) {
        honeypotIndicators.push('hidden_fields_detected');
    }
    
    // 2. Check for suspicious timing patterns (too fast clicks)
    if (enrichedClick.clickSpeed && enrichedClick.clickSpeed < 100) { // Less than 100ms
        honeypotIndicators.push('suspicious_timing');
    }
    
    // 3. Check for missing or suspicious user behavior
    if (!enrichedClick.mouseMovements || enrichedClick.mouseMovements.length < 2) {
        honeypotIndicators.push('no_mouse_movement');
    }
    
    // 4. Check for suspicious user agent patterns
    if (enrichedClick.userAgent && (
        enrichedClick.userAgent.includes('bot') || 
        enrichedClick.userAgent.includes('crawler') ||
        enrichedClick.userAgent.includes('spider')
    )) {
        honeypotIndicators.push('bot_user_agent');
    }
    
    // 5. Check for missing referrer (direct access to tracking page)
    if (!enrichedClick.referrer || enrichedClick.referrer === '') {
        honeypotIndicators.push('no_referrer');
    }
    
    // Return honeypot details if any indicators found
    return honeypotIndicators.length > 0 ? {
        indicators: honeypotIndicators,
        count: honeypotIndicators.length
    } : null;
}

module.exports = { runRules }; 
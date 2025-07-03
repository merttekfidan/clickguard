const trackerService = require('./service');
const requestIp = require('request-ip');
const analysisService = require('../../services/analysis.service');
const { processedClicks } = require('../../workers/clickProcessor.worker');
const honeypotService = require('./honeypot.service');
const proofOfWorkService = require('./proofOfWork.service');
const ClickLog = require('../../models/ClickLog');

/**
 * Handle tracking data from client-side script
 */
const handleTrackingData = async (req, res) => {
    try {
        const trackingData = req.body;
        const clientIP = requestIp.getClientIp(req);
        // Optionally extract customerId and campaignId from request (if present)
        const customerId = trackingData.customerId || null;
        const campaignId = trackingData.campaignId || null;
        
        // Honeypot detection (modular)
        if (honeypotService.checkHoneypot(trackingData)) {
            const powChallenge = honeypotService.generateChallenge(trackingData.sessionId);
            console.warn('🪤 Honeypot triggered! Sending proof-of-work challenge to suspected bot:', {
                sessionId: trackingData.sessionId,
                ip: clientIP,
                domain: trackingData.domain,
                honeypot: trackingData.honeypot,
                ...powChallenge
            });
            return res.status(403).json({
                success: false,
                message: 'Bot detected (honeypot). Proof-of-work required.',
                reason: 'HONEYPOT_TRIGGERED',
                pow: powChallenge
            });
        }
        // Proof-of-work solution verification (modular)
        if (trackingData.pow) {
            const valid = proofOfWorkService.verifyProofOfWork(trackingData.pow, trackingData.sessionId);
            if (!valid) {
                console.warn('❌ Invalid proof-of-work solution! Bot blocked:', {
                    sessionId: trackingData.sessionId,
                    ip: clientIP,
                    domain: trackingData.domain,
                    pow: trackingData.pow
                });
                return res.status(403).json({
                    success: false,
                    message: 'Invalid proof-of-work solution',
                    reason: 'POW_INVALID'
                });
            } else {
                console.log('✅ Proof-of-work solved, click accepted:', {
                    sessionId: trackingData.sessionId,
                    ip: clientIP,
                    domain: trackingData.domain,
                    pow: trackingData.pow
                });
                // Continue processing as normal
            }
        }
        
        // Enhanced detailed logging for debugging
        console.log('🔎 Click details:', {
            method: req.method,
            url: trackingData.url,
            query: trackingData.query,
            gclid: trackingData.gclid,
            gclsrc: trackingData.gclsrc,
            utm_source: trackingData.utm_source,
            utm_medium: trackingData.utm_medium,
            utm_campaign: trackingData.utm_campaign,
            utm_term: trackingData.utm_term,
            utm_content: trackingData.utm_content,
            referrer: trackingData.referrer || req.get('referer'),
            domain: trackingData.domain
        });
        
        // Step 1: Log raw click received (as per technical plan)
        console.log('Raw click received:', { sessionId: trackingData.sessionId, ip: clientIP, domain: trackingData.domain });
        
        // Check if this is a Google Ads click and log specifically
        const isGoogleAdsClick = isGoogleAdsTrackingData(trackingData);
        if (isGoogleAdsClick) {
            console.log('🚨 GOOGLE ADS CLICK DETECTED:', {
                sessionId: trackingData.sessionId,
                ip: clientIP,
                domain: trackingData.domain,
                url: trackingData.url,
                referrer: trackingData.referrer,
                query: trackingData.query,
                gclid: trackingData.gclid,
                utm_source: trackingData.utm_source,
                utm_medium: trackingData.utm_medium,
                utm_campaign: trackingData.utm_campaign,
                customerId,
                campaignId,
                timestamp: new Date().toISOString()
            });
        }
        
        // Add IP address to tracking data
        const enrichedData = {
            ...trackingData,
            ipAddress: clientIP,
            serverTimestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent'],
            acceptLanguage: req.headers['accept-language'],
            headers: {
                'x-forwarded-for': req.headers['x-forwarded-for'],
                'x-real-ip': req.headers['x-real-ip'],
                'x-forwarded-proto': req.headers['x-forwarded-proto'],
                'x-forwarded-host': req.headers['x-forwarded-host']
            }
        };

        // Step 2: Pass to analysis service (with customerId/campaignId)
        await analysisService.processClick(enrichedData, customerId, campaignId);

        // Process the tracking data (store in memory for now)
        const result = await trackerService.processTrackingData(enrichedData);
        
        // Ensure isGoogleAds is always a Boolean
        const isGoogleAdsClickBool = !!isGoogleAdsClick;
        // Save click to MongoDB
        try {
            await ClickLog.create({
                timestamp: new Date(),
                sessionId: trackingData.sessionId,
                ipAddress: enrichedData.ipAddress,
                deviceFingerprint: enrichedData.deviceFingerprint,
                fingerprintCount: enrichedData.fingerprintCount,
                isGoogleAds: isGoogleAdsClickBool,
                decision: enrichedData.decision,
                reason: enrichedData.reason,
                block_type: enrichedData.block_type,
                blocked_entry: enrichedData.blocked_entry,
                honeypot: trackingData.honeypot,
                pow: trackingData.pow,
                method: req.method,
                url: trackingData.url,
                query: trackingData.query,
                gclid: trackingData.gclid,
                gclsrc: trackingData.gclsrc,
                utm_source: trackingData.utm_source,
                utm_medium: trackingData.utm_medium,
                utm_campaign: trackingData.utm_campaign,
                utm_term: trackingData.utm_term,
                utm_content: trackingData.utm_content,
                referrer: trackingData.referrer || req.get('referer'),
                domain: trackingData.domain
            });
        } catch (err) {
            console.error('❌ Failed to save click log to MongoDB:', err);
        }

        res.status(200).json({
            success: true,
            message: 'Tracking data received successfully',
            sessionId: enrichedData.sessionId,
            timestamp: enrichedData.serverTimestamp,
            ipAddress: enrichedData.ipAddress,
            isGoogleAds: isGoogleAdsClick
        });
        
    } catch (error) {
        console.error('Error processing tracking data:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
        });
    }
};

/**
 * Check if tracking data contains Google Ads parameters
 */
function isGoogleAdsTrackingData(trackingData) {
    const url = (trackingData.url || '').toLowerCase();
    const query = (trackingData.query || '').toLowerCase();
    const referrer = (trackingData.referrer || '').toLowerCase();
    
    // Check for Google Ads parameters
    const hasGclid = trackingData.gclid || query.includes('gclid=') || url.includes('gclid=');
    const hasUtmSource = trackingData.utm_source || query.includes('utm_source=') || url.includes('utm_source=');
    const hasGoogleReferrer = referrer.includes('google.com') || referrer.includes('googleadservices.com');
    
    return hasGclid || hasUtmSource || hasGoogleReferrer;
}

/**
 * Get basic tracking statistics (in-memory)
 */
const getTrackingStats = async (req, res) => {
    try {
        const stats = await trackerService.getTrackingStats();
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting tracking stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get recent click details
 */
const getRecentClicks = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const filter = {
            decision: req.query.decision,
            domain: req.query.domain,
            ipAddress: req.query.ipAddress
        };
        
        // Remove undefined filters
        Object.keys(filter).forEach(key => {
            if (filter[key] === undefined) {
                delete filter[key];
            }
        });
        
        const clicks = analysisService.getRecentClicks(limit, Object.keys(filter).length > 0 ? filter : null);
        
        res.status(200).json({
            success: true,
            data: {
                clicks,
                total: clicks.length,
                limit,
                filter: Object.keys(filter).length > 0 ? filter : null
            }
        });
    } catch (error) {
        console.error('Error getting recent clicks:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get specific click details by ID
 */
const getClickDetails = async (req, res) => {
    try {
        const { clickId } = req.params;
        const click = analysisService.getClickById(clickId);
        
        if (!click) {
            return res.status(404).json({
                success: false,
                message: 'Click not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: click
        });
    } catch (error) {
        console.error('Error getting click details:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get Google Ads statistics
 */
const getGoogleAdsStats = async (req, res) => {
    try {
        const stats = analysisService.getGoogleAdsStats();
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting Google Ads stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get processed clicks (debug endpoint)
 */
const getProcessedClicks = async (req, res) => {
    res.status(200).json({
        success: true,
        data: processedClicks
    });
};

module.exports = {
    handleTrackingData,
    getTrackingStats,
    getRecentClicks,
    getClickDetails,
    getGoogleAdsStats,
    getProcessedClicks
}; 
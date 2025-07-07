const trackerService = require('./service');
const requestIp = require('request-ip');
const ClickLog = require('../../models/ClickLog');
const logBuilder = require('../../services/logBuilder.service');
const ruleEngine = require('../../services/ruleEngine.service');
const enrichmentService = require('../../services/enrichment.service');

/**
 * Handle tracking data from client-side script
 */
const handleTrackingData = async (req, res) => {
    try {
        const rawData = req.body;
        const clientIP = requestIp.getClientIp(req);
        // 1. Enrich data using enrichmentService
        const enrichedData = await enrichmentService.enrich(rawData, clientIP);
        // 2. Run rule engine
        const ruleResult = await ruleEngine.runRules(enrichedData, {/* contextData if needed */});
        // 3. Build log object
        const logObject = logBuilder.build({ ...enrichedData, ...ruleResult });
        // 4. Save to DB
        await ClickLog.create(logObject);
        // 5. Update in-memory stats (removed, no longer needed)
        // 6. Respond to client
        res.json({ success: true });
    } catch (error) {
        console.error('Error in handleTrackingData:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
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
        
        const clicks = await ClickLog.find(Object.keys(filter).length > 0 ? filter : null).sort({ timestamp: -1 }).limit(limit);
        
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
        const click = await ClickLog.findById(clickId);
        
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
        const clicks = await ClickLog.find({ isGoogleAds: true });
        const totalClicks = await ClickLog.countDocuments();
        const googleAdsClicks = clicks.length;
        const googleAdsPercentage = totalClicks > 0 ? (googleAdsClicks / totalClicks) * 100 : 0;

        res.status(200).json({
            success: true,
            data: {
                totalClicks,
                googleAdsClicks,
                googleAdsPercentage
            }
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
    try {
        const clicks = await ClickLog.find({ isProcessed: true }).sort({ timestamp: -1 }).limit(20);
        res.status(200).json({
            success: true,
            data: clicks
        });
    } catch (error) {
        console.error('Error getting processed clicks:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    handleTrackingData,
    getTrackingStats,
    getRecentClicks,
    getClickDetails,
    getGoogleAdsStats,
    getProcessedClicks
}; 
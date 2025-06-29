const trackerService = require('./service');
const requestIp = require('request-ip');
const analysisService = require('../../services/analysis.service');

/**
 * Handle tracking data from client-side script
 */
const handleTrackingData = async (req, res) => {
    try {
        const trackingData = req.body;
        const clientIP = requestIp.getClientIp(req);
        
        // Step 1: Log raw click received (as per technical plan)
        console.log('Raw click received:', { sessionId: trackingData.sessionId, ip: clientIP, domain: trackingData.domain });
        
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

        // Step 2: Pass to analysis service
        await analysisService.processClick(enrichedData);

        // Process the tracking data (store in memory for now)
        const result = await trackerService.processTrackingData(enrichedData);
        
        res.status(200).json({
            success: true,
            message: 'Tracking data received successfully',
            sessionId: enrichedData.sessionId,
            timestamp: enrichedData.serverTimestamp,
            ipAddress: enrichedData.ipAddress
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

module.exports = {
    handleTrackingData,
    getTrackingStats,
    getRecentClicks,
    getClickDetails,
    getGoogleAdsStats
}; 
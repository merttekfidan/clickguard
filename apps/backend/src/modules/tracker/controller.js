const trackerService = require('./service');
const requestIp = require('request-ip');

/**
 * Handle tracking data from client-side script
 */
const handleTrackingData = async (req, res) => {
    try {
        const trackingData = req.body;
        const clientIP = requestIp.getClientIp(req);
        
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

module.exports = {
    handleTrackingData,
    getTrackingStats
}; 
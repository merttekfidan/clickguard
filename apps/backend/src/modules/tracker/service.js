// In-memory storage for tracking data (replace with database later)
let trackingData = [];
let stats = {
    totalRecords: 0,
    uniqueSessions: new Set(),
    uniqueDomains: new Set(),
    uniqueIPs: new Set()
};

class TrackerService {
    /**
     * Process and store tracking data in memory
     */
    static async processTrackingData(data) {
        try {
            // Store the tracking data in memory
            trackingData.push({
                ...data,
                id: Date.now() + Math.random().toString(36).substr(2, 9)
            });
            
            // Update statistics
            stats.totalRecords++;
            stats.uniqueSessions.add(data.sessionId);
            stats.uniqueDomains.add(data.domain);
            stats.uniqueIPs.add(data.ipAddress);
            
            // Keep only last 1000 records to prevent memory issues
            if (trackingData.length > 1000) {
                trackingData = trackingData.slice(-1000);
            }
            
            console.log(`📊 Tracking data stored for session: ${data.sessionId} from domain: ${data.domain} (IP: ${data.ipAddress})`);
            
            return {
                success: true,
                recordId: trackingData[trackingData.length - 1].id
            };
            
        } catch (error) {
            console.error('Error storing tracking data:', error);
            throw error;
        }
    }
    
    /**
     * Get basic tracking statistics
     */
    static async getTrackingStats() {
        try {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            // Calculate today's records
            const todayRecords = trackingData.filter(record => 
                new Date(record.timestamp) >= oneDayAgo
            ).length;
            
            // Get top domains
            const domainCounts = {};
            trackingData.forEach(record => {
                domainCounts[record.domain] = (domainCounts[record.domain] || 0) + 1;
            });
            
            const topDomains = Object.entries(domainCounts)
                .map(([domain, count]) => ({ _id: domain, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            
            return {
                totalRecords: stats.totalRecords,
                todayRecords,
                uniqueSessions: stats.uniqueSessions.size,
                uniqueDomains: stats.uniqueDomains.size,
                uniqueIPs: stats.uniqueIPs.size,
                topDomains,
                memoryUsage: {
                    recordsInMemory: trackingData.length,
                    maxRecords: 1000
                }
            };
            
        } catch (error) {
            console.error('Error getting tracking stats:', error);
            throw error;
        }
    }
    
    /**
     * Get all tracking data (for debugging)
     */
    static async getAllTrackingData() {
        return trackingData;
    }
    
    /**
     * Clear all tracking data (for testing)
     */
    static async clearTrackingData() {
        trackingData = [];
        stats = {
            totalRecords: 0,
            uniqueSessions: new Set(),
            uniqueDomains: new Set(),
            uniqueIPs: new Set()
        };
        console.log('🗑️ All tracking data cleared');
    }
}

module.exports = TrackerService; 
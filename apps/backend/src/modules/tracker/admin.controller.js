const ClickLog = require('../../models/ClickLog');

/**
 * Get comprehensive admin statistics
 */
const getAdminStats = async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getFullYear(), now.getMonth() - 1, now.getDate());

        // Aggregate statistics
        const stats = await ClickLog.aggregate([
            {
                $facet: {
                    // Total clicks
                    totalClicks: [{ $count: "count" }],
                    
                    // Today's clicks
                    todayClicks: [
                        { $match: { timestamp: { $gte: today } } },
                        { $count: "count" }
                    ],
                    
                    // This week's clicks
                    weekClicks: [
                        { $match: { timestamp: { $gte: weekAgo } } },
                        { $count: "count" }
                    ],
                    
                    // This month's clicks
                    monthClicks: [
                        { $match: { timestamp: { $gte: monthAgo } } },
                        { $count: "count" }
                    ],
                    
                    // Bot detections
                    totalBots: [
                        { $match: { decision: "blocked" } },
                        { $count: "count" }
                    ],
                    
                    todayBots: [
                        { 
                            $match: { 
                                decision: "blocked",
                                timestamp: { $gte: today }
                            }
                        },
                        { $count: "count" }
                    ],
                    
                    // Active domains (last 24 hours)
                    activeDomains: [
                        { $match: { timestamp: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } },
                        { $group: { _id: "$domain" } },
                        { $count: "count" }
                    ],
                    
                    // Google Ads clicks
                    googleAdsClicks: [
                        { $match: { isGoogleAds: true } },
                        { $count: "count" }
                    ],
                    
                    // Honeypot triggers
                    honeypotTriggers: [
                        { $match: { honeypot: { $ne: "" } } },
                        { $count: "count" }
                    ],
                    
                    todayHoneypot: [
                        { 
                            $match: { 
                                honeypot: { $ne: "" },
                                timestamp: { $gte: today }
                            }
                        },
                        { $count: "count" }
                    ],
                    
                    // Proof-of-work success rate
                    powStats: [
                        { $match: { "pow.challenge": { $exists: true } } },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                solved: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$pow.solved", true] },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        const result = stats[0];
        
        // Calculate percentages and format data
        const totalClicks = result.totalClicks[0]?.count || 0;
        const totalBots = result.totalBots[0]?.count || 0;
        const googleAdsClicks = result.googleAdsClicks[0]?.count || 0;
        
        const formattedStats = {
            totalClicks: {
                total: totalClicks,
                today: result.todayClicks[0]?.count || 0,
                week: result.weekClicks[0]?.count || 0,
                month: result.monthClicks[0]?.count || 0
            },
            botDetections: {
                total: totalBots,
                today: result.todayBots[0]?.count || 0,
                rate: totalClicks > 0 ? ((totalBots / totalClicks) * 100).toFixed(2) : 0
            },
            activeDomains: result.activeDomains[0]?.count || 0,
            googleAds: {
                clicks: googleAdsClicks,
                rate: totalClicks > 0 ? ((googleAdsClicks / totalClicks) * 100).toFixed(2) : 0
            },
            honeypot: {
                total: result.honeypotTriggers[0]?.count || 0,
                today: result.todayHoneypot[0]?.count || 0
            },
            proofOfWork: {
                total: result.powStats[0]?.total || 0,
                solved: result.powStats[0]?.solved || 0,
                successRate: result.powStats[0]?.total > 0 
                    ? ((result.powStats[0].solved / result.powStats[0].total) * 100).toFixed(2) 
                    : 0
            }
        };

        res.status(200).json({
            success: true,
            data: formattedStats
        });

    } catch (error) {
        console.error('Error getting admin stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get filtered admin logs
 */
const getAdminLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            domain,
            decision,
            startDate,
            endDate,
            isGoogleAds
        } = req.query;

        const skip = (page - 1) * limit;
        
        // Build filter
        const filter = {};
        
        if (domain) filter.domain = domain;
        if (decision) filter.decision = decision;
        if (isGoogleAds !== undefined) filter.isGoogleAds = isGoogleAds === 'true';
        
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        // Get logs with pagination
        const logs = await ClickLog.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-deviceFingerprint -honeypot -pow'); // Exclude sensitive data but include ipInfo

        // Get total count
        const total = await ClickLog.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                logs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error getting admin logs:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get domain statistics
 */
const getDomainStats = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        const domainStats = await ClickLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            {
                $group: {
                    _id: "$domain",
                    totalClicks: { $sum: 1 },
                    botClicks: {
                        $sum: {
                            $cond: [
                                { $eq: ["$decision", "blocked"] },
                                1,
                                0
                            ]
                        }
                    },
                    googleAdsClicks: {
                        $sum: {
                            $cond: [
                                { $eq: ["$isGoogleAds", true] },
                                1,
                                0
                            ]
                        }
                    },
                    lastClick: { $max: "$timestamp" },
                    uniqueIPs: { $addToSet: "$ipAddress" }
                }
            },
            {
                $project: {
                    domain: "$_id",
                    totalClicks: 1,
                    botClicks: 1,
                    googleAdsClicks: 1,
                    botRate: {
                        $multiply: [
                            { $divide: ["$botClicks", "$totalClicks"] },
                            100
                        ]
                    },
                    googleAdsRate: {
                        $multiply: [
                            { $divide: ["$googleAdsClicks", "$totalClicks"] },
                            100
                        ]
                    },
                    lastClick: 1,
                    uniqueIPs: { $size: "$uniqueIPs" }
                }
            },
            { $sort: { totalClicks: -1 } },
            { $limit: 20 }
        ]);

        res.status(200).json({
            success: true,
            data: domainStats
        });

    } catch (error) {
        console.error('Error getting domain stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get domain details
 */
const getDomainDetails = async (req, res) => {
    try {
        const { domainId } = req.params;
        const { days = 30 } = req.query;
        const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        // Get domain-specific stats
        const domainStats = await ClickLog.aggregate([
            { 
                $match: { 
                    domain: domainId,
                    timestamp: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                        decision: "$decision"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    allowed: {
                        $sum: {
                            $cond: [
                                { $eq: ["$_id.decision", "allowed"] },
                                "$count",
                                0
                            ]
                        }
                    },
                    blocked: {
                        $sum: {
                            $cond: [
                                { $eq: ["$_id.decision", "blocked"] },
                                "$count",
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                domain: domainId,
                dailyStats: domainStats
            }
        });

    } catch (error) {
        console.error('Error getting domain details:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get bot statistics
 */
const getBotStats = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        const botStats = await ClickLog.aggregate([
            { 
                $match: { 
                    decision: "blocked",
                    timestamp: { $gte: startDate }
                }
            },
            {
                $facet: {
                    // Bot detection methods
                    detectionMethods: [
                        {
                            $group: {
                                _id: "$block_type",
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } }
                    ],
                    
                    // Top bot IPs
                    topIPs: [
                        {
                            $group: {
                                _id: "$ipAddress",
                                count: { $sum: 1 },
                                firstAttack: { $min: "$timestamp" },
                                lastAttack: { $max: "$timestamp" },
                                domains: { $addToSet: "$domain" }
                            }
                        },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ],
                    
                    // Proof-of-work stats
                    powStats: [
                        { $match: { "pow.challenge": { $exists: true } } },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                solved: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$pow.solved", true] },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        const result = botStats[0];
        
        res.status(200).json({
            success: true,
            data: {
                detectionMethods: result.detectionMethods,
                topIPs: result.topIPs.map(ip => ({
                    ...ip,
                    domains: ip.domains.length
                })),
                proofOfWork: result.powStats[0] || { total: 0, solved: 0 }
            }
        });

    } catch (error) {
        console.error('Error getting bot stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get bot IP details
 */
const getBotIPDetails = async (req, res) => {
    try {
        const { ipAddress } = req.params;
        const { days = 30 } = req.query;
        const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        const ipStats = await ClickLog.aggregate([
            {
                $match: {
                    ipAddress: ipAddress,
                    decision: "blocked",
                    timestamp: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                        blockType: "$block_type"
                    },
                    count: { $sum: 1 },
                    domains: { $addToSet: "$domain" }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    attacks: {
                        $push: {
                            blockType: "$_id.blockType",
                            count: "$count",
                            domains: "$domains"
                        }
                    },
                    totalAttacks: { $sum: "$count" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                ipAddress,
                dailyStats: ipStats
            }
        });

    } catch (error) {
        console.error('Error getting bot IP details:', error);
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
        const { days = 7 } = req.query;
        const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        const googleAdsStats = await ClickLog.aggregate([
            {
                $match: {
                    isGoogleAds: true,
                    timestamp: { $gte: startDate }
                }
            },
            {
                $facet: {
                    // Overall stats
                    overall: [
                        {
                            $group: {
                                _id: null,
                                totalClicks: { $sum: 1 },
                                botClicks: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$decision", "blocked"] },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    
                    // Campaign stats
                    campaigns: [
                        {
                            $group: {
                                _id: "$utm_campaign",
                                clicks: { $sum: 1 },
                                botClicks: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$decision", "blocked"] },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        },
                        { $sort: { clicks: -1 } },
                        { $limit: 10 }
                    ],
                    
                    // Daily trend
                    dailyTrend: [
                        {
                            $group: {
                                _id: {
                                    date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                                    decision: "$decision"
                                },
                                count: { $sum: 1 }
                            }
                        },
                        {
                            $group: {
                                _id: "$_id.date",
                                allowed: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$_id.decision", "allowed"] },
                                            "$count",
                                            0
                                        ]
                                    }
                                },
                                blocked: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$_id.decision", "blocked"] },
                                            "$count",
                                            0
                                        ]
                                    }
                                }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ]
                }
            }
        ]);

        const result = googleAdsStats[0];
        const overall = result.overall[0] || { totalClicks: 0, botClicks: 0 };

        res.status(200).json({
            success: true,
            data: {
                overall: {
                    totalClicks: overall.totalClicks,
                    botClicks: overall.botClicks,
                    botRate: overall.totalClicks > 0 
                        ? ((overall.botClicks / overall.totalClicks) * 100).toFixed(2) 
                        : 0
                },
                campaigns: result.campaigns,
                dailyTrend: result.dailyTrend
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
 * Get Google Ads campaigns
 */
const getGoogleAdsCampaigns = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        const campaigns = await ClickLog.aggregate([
            {
                $match: {
                    isGoogleAds: true,
                    timestamp: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        campaign: "$utm_campaign",
                        source: "$utm_source",
                        medium: "$utm_medium"
                    },
                    clicks: { $sum: 1 },
                    botClicks: {
                        $sum: {
                            $cond: [
                                { $eq: ["$decision", "blocked"] },
                                1,
                                0
                            ]
                        }
                    },
                    lastClick: { $max: "$timestamp" }
                }
            },
            {
                $project: {
                    campaign: "$_id.campaign",
                    source: "$_id.source",
                    medium: "$_id.medium",
                    clicks: 1,
                    botClicks: 1,
                    botRate: {
                        $multiply: [
                            { $divide: ["$botClicks", "$clicks"] },
                            100
                        ]
                    },
                    lastClick: 1
                }
            },
            { $sort: { clicks: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: campaigns
        });

    } catch (error) {
        console.error('Error getting Google Ads campaigns:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAdminStats,
    getAdminLogs,
    getDomainStats,
    getDomainDetails,
    getBotStats,
    getBotIPDetails,
    getGoogleAdsStats,
    getGoogleAdsCampaigns
}; 
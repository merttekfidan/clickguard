const express = require('express');
const router = express.Router();

// GET /api/v1/dashboard/kpis - Get KPI data
router.get('/kpis', (req, res) => {
  try {
    // Mock KPI data as specified in the API specification
    const kpiData = {
      success: true,
      data: {
        protectionStatus: {
          status: 'Active',
          icon: 'Shield',
          color: 'green',
          description: 'Your campaigns are protected'
        },
        totalBlockedClicks: {
          value: 1248,
          change: '+15%',
          changeType: 'increase',
          period: 'vs. last month',
          description: 'Total clicks blocked'
        },
        protectedBudget: {
          value: 2500,
          currency: 'USD',
          description: "You didn't spend this money on fraudulent clicks",
          period: 'This month'
        },
        mostAttackedKeyword: {
          keyword: 'emergency locksmith new york',
          attacks: 89,
          description: 'Most targeted keyword'
        }
      },
      timestamp: new Date().toISOString()
    };

    console.log('📊 KPI data requested from:', req.ip);
    res.json(kpiData);
  } catch (error) {
    console.error('❌ Error fetching KPI data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KPI data',
      message: error.message
    });
  }
});

// GET /api/v1/dashboard/charts - Get chart data
router.get('/charts', (req, res) => {
  try {
    // Mock chart data
    const chartData = {
      success: true,
      data: {
        blockedClicksChart: [
          { date: '03/01', blocked: 45 },
          { date: '03/02', blocked: 52 },
          { date: '03/03', blocked: 38 },
          { date: '03/04', blocked: 71 },
          { date: '03/05', blocked: 43 },
          { date: '03/06', blocked: 65 },
          { date: '03/07', blocked: 58 },
          { date: '03/08', blocked: 42 },
          { date: '03/09', blocked: 89 },
          { date: '03/10', blocked: 76 },
          { date: '03/11', blocked: 45 },
          { date: '03/12', blocked: 62 },
          { date: '03/13', blocked: 55 },
          { date: '03/14', blocked: 48 },
        ],
        threatTypesPie: [
          { name: 'Data Center/Proxy IPs', value: 55, color: '#ef4444' },
          { name: 'High Click Frequency', value: 35, color: '#f97316' },
          { name: 'Behavioral Anomaly', value: 10, color: '#eab308' }
        ]
      },
      timestamp: new Date().toISOString()
    };

    console.log('📈 Chart data requested from:', req.ip);
    res.json(chartData);
  } catch (error) {
    console.error('❌ Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data',
      message: error.message
    });
  }
});

// GET /api/v1/dashboard/table - Get table data
router.get('/table', (req, res) => {
  try {
    // Mock table data
    const tableData = {
      success: true,
      data: {
        threatFeed: [
          { 
            id: 1, 
            type: 'block', 
            message: 'IP address "185.220.101.42" was blocked due to "High Click Frequency"', 
            time: '2 minutes ago', 
            icon: 'Shield' 
          },
          { 
            id: 2, 
            type: 'warning', 
            message: 'Unusual click pattern detected from Russia', 
            time: '5 minutes ago', 
            icon: 'AlertTriangle' 
          },
          { 
            id: 3, 
            type: 'block', 
            message: 'IP address "45.128.232.15" was blocked due to "VPN Detected"', 
            time: '8 minutes ago', 
            icon: 'Shield' 
          },
          { 
            id: 4, 
            type: 'block', 
            message: 'IP address "92.118.160.61" was blocked due to "Data Center IP"', 
            time: '12 minutes ago', 
            icon: 'Shield' 
          },
          { 
            id: 5, 
            type: 'warning', 
            message: 'High click velocity on keyword "emergency locksmith"', 
            time: '15 minutes ago', 
            icon: 'AlertTriangle' 
          }
        ],
        recentBlocks: [
          { ip: '85.102.34.11', country: 'Turkey', flag: '🇹🇷', reason: 'VPN Detected', datetime: '26.03.2025 14:32' },
          { ip: '192.168.45.23', country: 'Russia', flag: '🇷🇺', reason: 'Data Center IP', datetime: '26.03.2025 14:28' },
          { ip: '45.76.112.8', country: 'China', flag: '🇨🇳', reason: 'High Click Frequency', datetime: '26.03.2025 14:25' },
          { ip: '103.251.167.21', country: 'India', flag: '🇮🇳', reason: 'Behavioral Anomaly', datetime: '26.03.2025 14:20' },
          { ip: '217.182.139.45', country: 'Germany', flag: '🇩🇪', reason: 'VPN Detected', datetime: '26.03.2025 14:15' }
        ]
      },
      timestamp: new Date().toISOString()
    };

    console.log('📋 Table data requested from:', req.ip);
    res.json(tableData);
  } catch (error) {
    console.error('❌ Error fetching table data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table data',
      message: error.message
    });
  }
});

// GET /api/v1/dashboard/mcc-info - Get MCC account information
router.get('/mcc-info', (req, res) => {
  try {
    // Mock MCC info data
    const mccInfo = {
      success: true,
      id: '863-150-7642',
      name: 'ClickGuard MCC Account',
      status: 'active',
      timestamp: new Date().toISOString()
    };

    console.log('📊 MCC info requested from:', req.ip);
    res.json(mccInfo);
  } catch (error) {
    console.error('❌ Error fetching MCC info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch MCC info',
      message: error.message
    });
  }
});

// GET /api/v1/dashboard/mcc-campaigns - Get MCC campaigns
router.get('/mcc-campaigns', (req, res) => {
  try {
    // Mock MCC campaigns data
    const mccCampaigns = {
      success: true,
      campaigns: [
        {
          id: '123456789',
          name: 'Emergency Locksmith Campaign',
          status: 'ENABLED',
          budget: 5000,
          impressions: 15000,
          clicks: 450,
          cost: 1250
        },
        {
          id: '987654321',
          name: 'Plumbing Services Campaign',
          status: 'ENABLED',
          budget: 3000,
          impressions: 8500,
          clicks: 280,
          cost: 890
        }
      ],
      timestamp: new Date().toISOString()
    };

    console.log('📊 MCC campaigns requested from:', req.ip);
    res.json(mccCampaigns);
  } catch (error) {
    console.error('❌ Error fetching MCC campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch MCC campaigns',
      message: error.message
    });
  }
});

module.exports = router; 
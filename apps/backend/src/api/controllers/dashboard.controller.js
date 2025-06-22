const ClickLog = require('../../models/ClickLog');
const BlockedIP = require('../../models/BlockedIP');
const ConnectedAccount = require('../../models/ConnectedAccount');
const User = require('../../models/User');
const googleAdsService = require('../../services/googleAds.service');
const googleAdsActionWorker = require('../../workers/googleAdsAction.worker');

const getOverview = async (req, res) => {
  try {
    const userId = req.user.id;
    const timeRange = req.query.timeRange || '24h'; // 24h, 7d, 30d
    
    // Calculate time range
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 24h
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get user's connected accounts
    const connectedAccounts = await ConnectedAccount.findAll({
      where: { userId, isActive: true }
    });

    const accountIds = connectedAccounts.map(acc => acc.id);

    // Get click statistics
    const allClicks = await ClickLog.findAll({
      where: {
        accountId: accountIds,
        timestamp: { $gte: startDate }
      }
    });

    const totalClicks = allClicks.length;
    const avgFraudScore = totalClicks > 0 
      ? Math.round(allClicks.reduce((sum, click) => sum + click.fraudScore, 0) / totalClicks)
      : 0;
    const highRiskClicks = allClicks.filter(click => click.fraudScore >= 70).length;

    // Get blocked IP statistics
    const blockedIPs = await BlockedIP.findAll({
      where: {
        accountId: accountIds,
        blockTimestamp: { $gte: startDate }
      }
    });

    const totalBlocked = blockedIPs.length;

    // Get recent threats
    const recentThreats = await ClickLog.findAll({
      where: {
        accountId: accountIds,
        fraudScore: { $gte: 70 },
        timestamp: { $gte: startDate }
      },
      order: [['timestamp', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      data: {
        timeRange,
        totalClicks,
        averageFraudScore: avgFraudScore,
        highRiskClicks,
        totalBlockedIPs: totalBlocked,
        recentThreats: recentThreats.map(threat => ({
          id: threat.id,
          ipAddress: threat.ipAddress,
          fraudScore: threat.fraudScore,
          reason: threat.decision?.reason,
          timestamp: threat.timestamp,
          accountName: connectedAccounts.find(acc => acc.id === threat.accountId)?.googleAdsAccountName
        }))
      }
    });

  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get dashboard overview'
    });
  }
};

const getClickLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, accountId, fraudScore, action } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Get user's account IDs
    const connectedAccounts = await ConnectedAccount.findAll({
      where: { userId, isActive: true }
    });

    let allClicks = await ClickLog.findAll({
      where: { accountId: connectedAccounts.map(acc => acc.id) }
    });

    // Apply filters
    if (accountId) {
      allClicks = allClicks.filter(click => click.accountId === accountId);
    }
    
    if (fraudScore) {
      allClicks = allClicks.filter(click => click.fraudScore >= parseInt(fraudScore));
    }
    
    if (action) {
      allClicks = allClicks.filter(click => click.decision?.action === action);
    }

    // Sort by timestamp descending
    allClicks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = allClicks.length;
    const clicks = allClicks.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: {
        clicks: clicks.map(click => ({
          id: click.id,
          ipAddress: click.ipAddress,
          fraudScore: click.fraudScore,
          decision: click.decision,
          country: click.country,
          city: click.city,
          isVpn: click.isVpn,
          isProxy: click.isProxy,
          isTor: click.isTor,
          timestamp: click.timestamp,
          accountName: connectedAccounts.find(acc => acc.id === click.accountId)?.googleAdsAccountName
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting click logs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get click logs'
    });
  }
};

const getClickLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get user's account IDs
    const connectedAccounts = await ConnectedAccount.findAll({
      where: { userId, isActive: true }
    });

    const clickLog = await ClickLog.findById(id);
    
    if (!clickLog || !connectedAccounts.find(acc => acc.id === clickLog.accountId)) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Click log not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: clickLog.id,
        ipAddress: clickLog.ipAddress,
        userAgent: clickLog.userAgent,
        keyword: clickLog.keyword,
        gclid: clickLog.gclid,
        campaignId: clickLog.campaignId,
        adGroupId: clickLog.adGroupId,
        fraudScore: clickLog.fraudScore,
        decision: clickLog.decision,
        country: clickLog.country,
        city: clickLog.city,
        region: clickLog.region,
        isVpn: clickLog.isVpn,
        isProxy: clickLog.isProxy,
        isHosting: clickLog.isHosting,
        isTor: clickLog.isTor,
        ipReputationData: clickLog.ipReputationData,
        processingTime: clickLog.processingTime,
        timestamp: clickLog.timestamp,
        accountName: connectedAccounts.find(acc => acc.id === clickLog.accountId)?.googleAdsAccountName
      }
    });

  } catch (error) {
    console.error('Error getting click log:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get click log'
    });
  }
};

const getBlockedIPs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, accountId } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Get user's account IDs
    const connectedAccounts = await ConnectedAccount.findAll({
      where: { userId, isActive: true }
    });

    let blockedIPs = await BlockedIP.findAll({
      where: { accountId: connectedAccounts.map(acc => acc.id) }
    });

    if (accountId) {
      blockedIPs = blockedIPs.filter(ip => ip.accountId === accountId);
    }

    // Sort by block timestamp descending
    blockedIPs.sort((a, b) => new Date(b.blockTimestamp) - new Date(a.blockTimestamp));

    const total = blockedIPs.length;
    const ips = blockedIPs.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: {
        blockedIPs: ips.map(ip => ({
          id: ip.id,
          ipAddress: ip.ipAddress,
          reason: ip.reason,
          fraudScore: ip.fraudScore,
          blockSource: ip.blockSource,
          isActive: ip.isActive,
          blockTimestamp: ip.blockTimestamp,
          unblockTimestamp: ip.unblockTimestamp,
          clickCount: ip.clickCount,
          lastSeenAt: ip.lastSeenAt,
          accountName: connectedAccounts.find(acc => acc.id === ip.accountId)?.googleAdsAccountName
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting blocked IPs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get blocked IPs'
    });
  }
};

const unblockIP = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get user's account IDs
    const connectedAccounts = await ConnectedAccount.findAll({
      where: { userId, isActive: true }
    });

    const blockedIP = await BlockedIP.findById(id);
    
    if (!blockedIP || !connectedAccounts.find(acc => acc.id === blockedIP.accountId)) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Blocked IP not found'
      });
    }

    await blockedIP.update({
      isActive: false,
      unblockTimestamp: new Date()
    });

    res.json({
      success: true,
      message: 'IP address unblocked successfully'
    });

  } catch (error) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to unblock IP'
    });
  }
};

const getConnectedAccounts = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const accounts = await ConnectedAccount.findAll({
      where: { userId, isActive: true }
    });

    res.json({
      success: true,
      data: accounts.map(account => ({
        id: account.id,
        googleAdsAccountId: account.googleAdsAccountId,
        googleAdsAccountName: account.googleAdsAccountName,
        isActive: account.isActive,
        lastSyncAt: account.lastSyncAt,
        settings: account.settings
      }))
    });

  } catch (error) {
    console.error('Error getting connected accounts:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get connected accounts'
    });
  }
};

const getConnectedAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const account = await ConnectedAccount.findById(id);
    
    if (!account || account.userId !== userId) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: account.id,
        googleAdsAccountId: account.googleAdsAccountId,
        googleAdsAccountName: account.googleAdsAccountName,
        isActive: account.isActive,
        lastSyncAt: account.lastSyncAt,
        settings: account.settings
      }
    });

  } catch (error) {
    console.error('Error getting connected account:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get connected account'
    });
  }
};

const getSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const accounts = await ConnectedAccount.findAll({
      where: { userId, isActive: true }
    });

    // Return default settings for now
    res.json({
      success: true,
      data: {
        globalSettings: {
          autoBlock: true,
          fraudScoreThreshold: 70,
          notificationEmail: true,
          notificationWebhook: false
        },
        accountSettings: accounts.map(account => ({
          accountId: account.id,
          accountName: account.googleAdsAccountName,
          settings: account.settings
        }))
      }
    });

  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get settings'
    });
  }
};

const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId, settings } = req.body;

    if (accountId) {
      const account = await ConnectedAccount.findById(accountId);
      
      if (!account || account.userId !== userId) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Account not found'
        });
      }

      await account.update({ settings: { ...account.settings, ...settings } });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update settings'
    });
  }
};

module.exports = {
  getOverview,
  getClickLogs,
  getClickLog,
  getBlockedIPs,
  unblockIP,
  getConnectedAccounts,
  getConnectedAccount,
  getSettings,
  updateSettings
}; 
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Globe, 
  Users, 
  Eye, 
  Clock, 
  RefreshCw,
  ExternalLink,
  Code
} from 'lucide-react';

interface TrackingStats {
  totalRecords: number;
  todayRecords: number;
  uniqueSessions: number;
  uniqueDomains: number;
  uniqueIPs: number;
  topDomains: Array<{ _id: string; count: number }>;
  memoryUsage: {
    recordsInMemory: number;
    maxRecords: number;
  };
}

const TrackingDashboard = () => {
  const [stats, setStats] = useState<TrackingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/tracker/stats');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.message || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching tracking stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    fetchStats();
  };

  const openTestPage = () => {
    window.open('/api/v1/tracker/test', '_blank');
  };

  const copyScriptTag = () => {
    const scriptTag = '<script src="/api/v1/tracker/script"></script>';
    navigator.clipboard.writeText(scriptTag);
    // You could add a toast notification here
    alert('Script tag copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Activity className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              ClickGuard Tracker Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Real-time tracking analytics and statistics
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={openTestPage} variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Test Page
            </Button>
            <Button onClick={copyScriptTag}>
              <Code className="h-4 w-4 mr-2" />
              Copy Script Tag
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Records */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalRecords.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                All time tracking data
              </p>
            </CardContent>
          </Card>

          {/* Today's Records */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Records</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.todayRecords.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Records from last 24 hours
              </p>
            </CardContent>
          </Card>

          {/* Unique Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.uniqueSessions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Individual user sessions
              </p>
            </CardContent>
          </Card>

          {/* Unique Domains */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Domains</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.uniqueDomains.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Websites using tracker
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Memory Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Memory Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Records in Memory</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.memoryUsage.recordsInMemory.toLocaleString()} / {stats?.memoryUsage.maxRecords.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${(stats?.memoryUsage.recordsInMemory || 0) / (stats?.memoryUsage.maxRecords || 1) * 100}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  In-memory storage (data will be lost on server restart)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Unique IPs */}
          <Card>
            <CardHeader>
              <CardTitle>Unique IP Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">
                {stats?.uniqueIPs.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">
                Distinct IP addresses tracked
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Domains */}
        <Card>
          <CardHeader>
            <CardTitle>Top Domains</CardTitle>
            <p className="text-sm text-muted-foreground">
              Websites with the most tracking activity
            </p>
          </CardHeader>
          <CardContent>
            {stats?.topDomains && stats.topDomains.length > 0 ? (
              <div className="space-y-3">
                {stats.topDomains.map((domain, index) => (
                  <div key={domain._id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <span className="font-medium">{domain._id}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {domain.count.toLocaleString()} records
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No domain data available</p>
            )}
          </CardContent>
        </Card>

        {/* Integration Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Integration Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Include the Script</h4>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <code className="text-sm">
                    &lt;script src="http://localhost:3001/api/v1/tracker/script"&gt;&lt;/script&gt;
                  </code>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">2. Track Custom Events (Optional)</h4>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <code className="text-sm">
                    ClickGuard.trackEvent('button_click', {'{'} buttonId: 'signup' {'}'});
                  </code>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">3. Test Your Integration</h4>
                <p className="text-sm text-muted-foreground">
                  Visit the test page to see the tracker in action and verify data collection.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrackingDashboard; 
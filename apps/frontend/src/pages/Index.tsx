import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, TrendingUp, DollarSign, Activity, Globe, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Types for our data
interface KpiData {
  protectionStatus: {
    status: string;
    icon: string;
    color: string;
    description: string;
  };
  totalBlockedClicks: {
    value: number;
    change: string;
    changeType: string;
    period: string;
    description: string;
  };
  protectedBudget: {
    value: number;
    currency: string;
    description: string;
    period: string;
  };
  mostAttackedKeyword: {
    keyword: string;
    attacks: number;
    description: string;
  };
}

interface ChartData {
  blockedClicksChart: Array<{ date: string; blocked: number }>;
  threatTypesPie: Array<{ name: string; value: number; color: string }>;
}

interface TableData {
  threatFeed: Array<{
    id: number;
    type: string;
    message: string;
    time: string;
    icon: string;
  }>;
  recentBlocks: Array<{
    ip: string;
    country: string;
    flag: string;
    reason: string;
    datetime: string;
  }>;
}

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [mccConnectionStatus, setMccConnectionStatus] = useState('disconnected');
  const [mccInfo, setMccInfo] = useState(null);

  // Dashboard data states
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Backend URL
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

  // Fetch dashboard data from backend
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch KPI data
      const kpiResponse = await fetch(`${backendUrl}/api/v1/dashboard/kpis`);
      if (!kpiResponse.ok) {
        throw new Error(`Failed to fetch KPI data: ${kpiResponse.status}`);
      }
      const kpiResult = await kpiResponse.json();
      
      if (kpiResult.success) {
        setKpiData(kpiResult.data);
      } else {
        throw new Error(kpiResult.error || 'Failed to fetch KPI data');
      }

      // Fetch chart data
      const chartResponse = await fetch(`${backendUrl}/api/v1/dashboard/charts`);
      if (chartResponse.ok) {
        const chartResult = await chartResponse.json();
        if (chartResult.success) {
          setChartData(chartResult.data);
        }
      }

      // Fetch table data
      const tableResponse = await fetch(`${backendUrl}/api/v1/dashboard/table`);
      if (tableResponse.ok) {
        const tableResult = await tableResponse.json();
        if (tableResult.success) {
          setTableData(tableResult.data);
        }
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    console.log('🏠 Home page (/) loaded!');
  }, []);

  useEffect(() => {
    fetch('/api/v1/dashboard/mcc-info', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('MCC Info:', data);
          setMccConnectionStatus('connected');
          setMccInfo(data);
        } else {
          console.error('Failed to fetch MCC info:', data.error);
          setMccConnectionStatus('error');
        }
      })
      .catch(err => {
        console.error('Error fetching MCC info:', err);
        setMccConnectionStatus('error');
      });
  }, []);

  const handleGetMccInfo = () => {
    setMccConnectionStatus('loading');
    fetch('/api/v1/dashboard/mcc-info', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('MCC Info:', data);
          setMccConnectionStatus('connected');
          setMccInfo(data);
        } else {
          console.error('Failed to fetch MCC info:', data.error);
          setMccConnectionStatus('error');
        }
      })
      .catch(err => {
        console.error('Error fetching MCC info:', err);
        setMccConnectionStatus('error');
      });
  };

  const handleGetMccCampaigns = () => {
    fetch('/api/v1/dashboard/mcc-campaigns', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('MCC Campaigns:', data);
        } else {
          console.error('Failed to fetch MCC campaigns:', data.error);
        }
      })
      .catch(err => {
        console.error('Error fetching MCC campaigns:', err);
      });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <Button onClick={fetchDashboardData} className="bg-blue-600 hover:bg-blue-700">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-neutral-900">
      {/* Header */}
      <header className="bg-card shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">ClickGuard</span>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">Beta</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">Connected</span>
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">✓</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* MCC Connection Status */}
        <div className="mb-6 p-4 rounded-lg border bg-white dark:bg-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                mccConnectionStatus === 'connected' ? 'bg-green-500' :
                mccConnectionStatus === 'loading' ? 'bg-yellow-500' :
                mccConnectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`}></div>
              <span className="font-medium">MCC Connection Status:</span>
              <span className={`${
                mccConnectionStatus === 'connected' ? 'text-green-600' :
                mccConnectionStatus === 'loading' ? 'text-yellow-600' :
                mccConnectionStatus === 'error' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {mccConnectionStatus === 'connected' ? 'Connected' :
                 mccConnectionStatus === 'loading' ? 'Connecting...' :
                 mccConnectionStatus === 'error' ? 'Connection Failed' : 'Disconnected'}
              </span>
            </div>
            {mccInfo && (
              <div className="text-sm text-gray-600">
                MCC ID: {mccInfo.id} | Name: {mccInfo.name}
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-card dark:bg-neutral-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Protection Status</p>
                  <div className="flex items-center mt-2">
                    <Shield className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-2xl font-bold text-green-600">
                      {kpiData?.protectionStatus?.status || 'Loading...'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-card dark:bg-neutral-800">
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Blocked Clicks</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {kpiData?.totalBlockedClicks?.value?.toLocaleString() || 'Loading...'}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {kpiData?.totalBlockedClicks?.change} {kpiData?.totalBlockedClicks?.period}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-card dark:bg-neutral-800">
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Protected Budget</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${kpiData?.protectedBudget?.value?.toLocaleString() || 'Loading...'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {kpiData?.protectedBudget?.description}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-card dark:bg-neutral-800">
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Most Attacked Keyword</p>
                <p className="text-lg font-semibold text-gray-900 mt-2 leading-tight">
                  {kpiData?.mostAttackedKeyword?.keyword || 'Loading...'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="mb-8 border-0 shadow-md bg-card dark:bg-neutral-800">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Blocked Click Activity (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData?.blockedClicksChart || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="blocked" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Threat Feed */}
          <Card className="border-0 shadow-md bg-card dark:bg-neutral-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Live Threat Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tableData?.threatFeed?.map((threat) => (
                  <div key={threat.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    {threat.icon === 'Shield' ? (
                      <Shield className={`h-5 w-5 mt-0.5 ${
                        threat.type === 'block' ? 'text-red-500' : 'text-yellow-500'
                      }`} />
                    ) : (
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                        threat.type === 'block' ? 'text-red-500' : 'text-yellow-500'
                      }`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{threat.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{threat.time}</p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-4 text-gray-500">Loading threat feed...</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Blocks */}
          <Card className="border-0 shadow-md bg-card dark:bg-neutral-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Recent IP Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tableData?.recentBlocks?.map((block, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{block.flag}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{block.ip}</p>
                        <p className="text-xs text-gray-500">{block.country}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-red-600">{block.reason}</p>
                      <p className="text-xs text-gray-500">{block.datetime}</p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-4 text-gray-500">Loading recent blocks...</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center mt-8 space-x-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={handleGetMccInfo}
            aria-label="Get MCC Account ID"
          >
            Get MCC Account ID
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400"
            onClick={handleGetMccCampaigns}
            aria-label="Get MCC Campaigns"
          >
            Get MCC Campaigns
          </button>
        </div>
      </main>
    </div>
  );
};

export default Index;

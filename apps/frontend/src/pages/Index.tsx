import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, TrendingUp, DollarSign, Activity, Globe, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import GoogleAdsConnect from '@/components/GoogleAdsConnect';

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [mccConnectionStatus, setMccConnectionStatus] = useState('disconnected');
  const [mccInfo, setMccInfo] = useState(null);

  // Sample data for when connected
  const chartData = [
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
  ];

  const pieData = [
    { name: 'Data Center/Proxy IPs', value: 55, color: '#ef4444' },
    { name: 'High Click Frequency', value: 35, color: '#f97316' },
    { name: 'Behavioral Anomaly', value: 10, color: '#eab308' }
  ];

  const threatFeed = [
    { id: 1, type: 'block', message: 'IP address "185.220.101.42" was blocked due to "High Click Frequency"', time: '2 minutes ago', icon: Shield },
    { id: 2, type: 'warning', message: 'Unusual click pattern detected from Russia', time: '5 minutes ago', icon: AlertTriangle },
    { id: 3, type: 'block', message: 'IP address "45.128.232.15" was blocked due to "VPN Detected"', time: '8 minutes ago', icon: Shield },
    { id: 4, type: 'block', message: 'IP address "92.118.160.61" was blocked due to "Data Center IP"', time: '12 minutes ago', icon: Shield },
    { id: 5, type: 'warning', message: 'High click velocity on keyword "emergency locksmith"', time: '15 minutes ago', icon: AlertTriangle },
  ];

  const recentBlocks = [
    { ip: '85.102.34.11', country: 'Turkey', flag: '🇹🇷', reason: 'VPN Detected', datetime: '26.03.2025 14:32' },
    { ip: '192.168.45.23', country: 'Russia', flag: '🇷🇺', reason: 'Data Center IP', datetime: '26.03.2025 14:28' },
    { ip: '45.76.112.8', country: 'China', flag: '🇨🇳', reason: 'High Click Frequency', datetime: '26.03.2025 14:25' },
    { ip: '103.251.167.21', country: 'India', flag: '🇮🇳', reason: 'Behavioral Anomaly', datetime: '26.03.2025 14:20' },
    { ip: '217.182.139.45', country: 'Germany', flag: '🇩🇪', reason: 'VPN Detected', datetime: '26.03.2025 14:15' },
  ];

  // Check if user has connected accounts
  useEffect(() => {
    const checkConnectedAccounts = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          // No token means user is not authenticated, so no connected accounts
          setIsConnected(false);
          return;
        }

        const response = await fetch(`${backendUrl}/api/v1/google-ads/accounts`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setConnectedAccounts(data.accounts || []);
          setIsConnected(data.accounts && data.accounts.length > 0);
        } else {
          // If the request fails, assume no connected accounts
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Error checking connected accounts:', error);
        setIsConnected(false);
      }
    };

    checkConnectedAccounts();
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

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background dark:bg-neutral-900">
        {/* Header */}
        <header className="bg-card shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">ClickGuard</span>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">Beta</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome</span>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">U</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Welcome to ClickGuard Beta
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Protect your Google Ads campaigns from click fraud. Connect your Google Ads account to get started.
              </p>
            </div>

            {/* MCC Connection Status */}
            <div className="mb-6 p-4 rounded-lg border">
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

            <GoogleAdsConnect />
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
          </div>
        </main>
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

        {/* Google Ads Integration Section */}
        <div className="mb-8">
          <GoogleAdsConnect />
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
                    <span className="text-2xl font-bold text-green-600">Active</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-card dark:bg-neutral-800">
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Blocked Clicks</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">1,248</p>
                <p className="text-sm text-green-600 mt-1">+15% vs. last month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-card dark:bg-neutral-800">
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Protected Budget</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">$2,500</p>
                <p className="text-xs text-gray-500 mt-1">You didn't spend this money on fraudulent clicks</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-card dark:bg-neutral-800">
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Most Attacked Keyword</p>
                <p className="text-lg font-semibold text-gray-900 mt-2 leading-tight">emergency locksmith new york</p>
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
                <LineChart data={chartData}>
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
                {threatFeed.map((threat) => (
                  <div key={threat.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <threat.icon className={`h-5 w-5 mt-0.5 ${
                      threat.type === 'block' ? 'text-red-500' : 'text-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{threat.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{threat.time}</p>
                    </div>
                  </div>
                ))}
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
                {recentBlocks.map((block, index) => (
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
                ))}
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

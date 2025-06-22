
import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, TrendingUp, DollarSign, Activity, Globe, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);

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

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">ClickGuard</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">John Smith</span>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">JS</span>
                </div>
                <Button variant="outline" size="sm">Logout</Button>
              </div>
            </div>
          </div>
        </header>

        {/* Onboarding */}
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="max-w-md w-full mx-4">
            <Card className="text-center shadow-xl border-0 bg-white/90 backdrop-blur">
              <CardHeader className="pb-6">
                <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Welcome to ClickGuard!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 leading-relaxed">
                  To start protecting your ad budget from click fraud, please connect your Google Ads account.
                </p>
                <Button 
                  onClick={() => setIsConnected(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
                  size="lg"
                >
                  Connect Google Ads Account
                </Button>
                <p className="text-xs text-gray-500 mt-4">
                  Your data is encrypted and secure. We never access your account without permission.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">ClickGuard</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">John Smith</span>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">JS</span>
              </div>
              <Button variant="outline" size="sm">Logout</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
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

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Blocked Clicks</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">1,248</p>
                <p className="text-sm text-green-600 mt-1">+15% vs. last month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Protected Budget</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">$2,500</p>
                <p className="text-xs text-gray-500 mt-1">You didn't spend this money on fraudulent clicks</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Most Attacked Keyword</p>
                <p className="text-lg font-semibold text-gray-900 mt-2 leading-tight">emergency locksmith new york</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="mb-8 border-0 shadow-md">
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
                    stroke="#2563eb" 
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Live Activity and Attack Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Live Threat Feed */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Live Threat Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {threatFeed.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={item.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-full ${item.type === 'block' ? 'bg-green-100' : 'bg-orange-100'}`}>
                        <IconComponent className={`h-4 w-4 ${item.type === 'block' ? 'text-green-600' : 'text-orange-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{item.message}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {item.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Attack Type Distribution */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Block Reasons (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Blocks Table */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Recently Blocked IP Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">IP Address</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Country</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Block Reason</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date/Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBlocks.map((block, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-sm text-gray-900">{block.ip}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{block.flag}</span>
                          <span className="text-sm text-gray-700">{block.country}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {block.reason}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{block.datetime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;

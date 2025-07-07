import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Globe, 
  Shield, 
  Bot, 
  TrendingUp, 
  AlertTriangle,
  Eye,
  BarChart3,
  MapPin,
  Clock,
  RefreshCw,
  ExternalLink,
  Code
} from 'lucide-react';
import { apiService, AdminStats, AdminLog, DomainStats, BotStats, GoogleAdsStats } from '@/services/api';
import OverviewTab from '@/components/admin/OverviewTab';
import RealtimeLogsTab from '@/components/admin/RealtimeLogsTab';
import DomainAnalysisTab from '@/components/admin/DomainAnalysisTab';
import BotAnalysisTab from '@/components/admin/BotAnalysisTab';
import GoogleAdsTab from '@/components/admin/GoogleAdsTab';

// Main Admin Dashboard Component
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
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
    alert('Script tag copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Dashboard verileri yükleniyor...</p>
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
              ClickGuard Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Çoklu domain click-fraud ve bot tespit sistemi
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>
            <Button onClick={openTestPage} variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Test Page
            </Button>
            <Button onClick={copyScriptTag}>
              <Code className="h-4 w-4 mr-2" />
              Copy Script Tag
            </Button>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Sistem Aktif
            </Badge>
          </div>
        </div>

        {/* Ana Tab Sistemi */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="domains">Domain Analizi</TabsTrigger>
            <TabsTrigger value="bots">Bot Analizi</TabsTrigger>
            <TabsTrigger value="logs">Canlı Loglar</TabsTrigger>
            <TabsTrigger value="googleads">Google Ads</TabsTrigger>
          </TabsList>

          {/* Genel Bakış Tab */}
          <TabsContent value="overview">
            <OverviewTab stats={stats} />
          </TabsContent>

          {/* Domain Analizi Tab */}
          <TabsContent value="domains">
            <DomainAnalysisTab />
          </TabsContent>

          {/* Bot Analizi Tab */}
          <TabsContent value="bots">
            <BotAnalysisTab />
          </TabsContent>

          {/* Canlı Loglar Tab */}
          <TabsContent value="logs">
            <RealtimeLogsTab />
          </TabsContent>

          {/* Google Ads Tab */}
          <TabsContent value="googleads">
            <GoogleAdsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard; 
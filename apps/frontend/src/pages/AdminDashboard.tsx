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

// Overview Tab Component
const OverviewTab = ({ stats }: { stats: AdminStats | null }) => {
  if (!stats) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Üst Kısım - Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Toplam Click */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Click</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClicks.total.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              {stats.totalClicks.today} bugün
            </div>
          </CardContent>
        </Card>

        {/* Bot Tespit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bot Tespit</CardTitle>
            <Bot className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.botDetections.total.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3 mr-1 text-orange-500" />
              {stats.botDetections.rate}% oranında
            </div>
          </CardContent>
        </Card>

        {/* Aktif Domain */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Domain</CardTitle>
            <Globe className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDomains}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              son 24 saat
            </div>
          </CardContent>
        </Card>

        {/* Google Ads Oranı */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Google Ads Oranı</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.googleAds.rate}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Eye className="h-3 w-3 mr-1" />
              {stats.googleAds.clicks.toLocaleString()} click
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orta Kısım - Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Click Trendi */}
        <Card>
          <CardHeader>
            <CardTitle>Son 7 Gün Click Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>Chart.js veya Recharts ile trend grafiği</p>
                <p className="text-sm">Normal vs Bot click trendi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bot Saldırı Türleri */}
        <Card>
          <CardHeader>
            <CardTitle>Bot Saldırı Türleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Fingerprint Abuse</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{width: '65%'}}></div>
                  </div>
                  <span className="text-sm font-medium">65%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Honeypot Trigger</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{width: '20%'}}></div>
                  </div>
                  <span className="text-sm font-medium">20%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Subnet Block</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{width: '15%'}}></div>
                  </div>
                  <span className="text-sm font-medium">15%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Realtime Logs Tab Component
const RealtimeLogsTab = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterDecision, setFilterDecision] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: {
        page?: number;
        limit?: number;
        domain?: string;
        decision?: string;
        startDate?: string;
        endDate?: string;
        isGoogleAds?: boolean;
      } = { page: pagination.page, limit: pagination.limit };
      if (filterDomain !== 'all') params.domain = filterDomain;
      if (filterDecision !== 'all') params.decision = filterDecision;
      
      const result = await apiService.getAdminLogs(params);
      setLogs(result.logs);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filterDomain, filterDecision]);

  return (
    <div className="space-y-6">
      {/* Filtreler */}
      <div className="flex gap-4 items-center">
        <select 
          className="px-3 py-2 border rounded-md bg-background"
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value)}
        >
          <option value="all">Tüm Domainler</option>
          <option value="localhost">localhost</option>
          <option value="merttekfidan.com">merttekfidan.com</option>
        </select>
        <select 
          className="px-3 py-2 border rounded-md bg-background"
          value={filterDecision}
          onChange={(e) => setFilterDecision(e.target.value)}
        >
          <option value="all">Tüm Kararlar</option>
          <option value="allowed">allowed</option>
          <option value="blocked">blocked</option>
        </select>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <Eye className="h-4 w-4 mr-2" />
          Filtrele
        </Button>
      </div>

      {/* Log Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle>Canlı Click Logları</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loglar yükleniyor...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Zaman</th>
                    <th className="text-left p-2">Domain</th>
                    <th className="text-left p-2">IP</th>
                    <th className="text-left p-2">Karar</th>
                    <th className="text-left p-2">Sebep</th>
                    <th className="text-left p-2">Google Ads</th>
                    <th className="text-left p-2">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-2 text-sm">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-2 text-sm font-medium">{log.domain}</td>
                      <td className="p-2 text-sm font-mono">{log.ipAddress}</td>
                      <td className="p-2">
                        <Badge variant={log.decision === 'allowed' ? 'default' : 'destructive'}>
                          {log.decision || 'N/A'}
                        </Badge>
                      </td>
                      <td className="p-2 text-sm text-gray-600 dark:text-gray-400">{log.reason || 'N/A'}</td>
                      <td className="p-2">
                        {log.isGoogleAds ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Evet
                          </Badge>
                        ) : (
                          <span className="text-gray-400">Hayır</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Domain Analysis Tab Component
const DomainAnalysisTab = () => {
  const [domains, setDomains] = useState<DomainStats[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDomainStats(7);
      setDomains(data);
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  return (
    <div className="space-y-6">
      {/* Domain Listesi */}
      <Card>
        <CardHeader>
          <CardTitle>Domain Performans Analizi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Domain verileri yükleniyor...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Domain</th>
                    <th className="text-left p-2">Toplam Click</th>
                    <th className="text-left p-2">Bot Sayısı</th>
                    <th className="text-left p-2">Bot Oranı</th>
                    <th className="text-left p-2">Google Ads Oranı</th>
                    <th className="text-left p-2">Son Click</th>
                    <th className="text-left p-2">Trend</th>
                    <th className="text-left p-2">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((domain) => (
                    <tr key={domain._id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-2 font-medium">{domain.domain}</td>
                      <td className="p-2">{domain.totalClicks.toLocaleString()}</td>
                      <td className="p-2 text-red-600">{domain.botClicks}</td>
                      <td className="p-2">{domain.botRate.toFixed(1)}%</td>
                      <td className="p-2">{domain.googleAdsRate.toFixed(1)}%</td>
                      <td className="p-2 text-sm">{new Date(domain.lastClick).toLocaleString()}</td>
                      <td className="p-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </td>
                      <td className="p-2">
                        <Button variant="outline" size="sm">
                          Detay
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Bot Analysis Tab Component
const BotAnalysisTab = () => {
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBotStats = async () => {
    try {
      setLoading(true);
      const data = await apiService.getBotStats(7);
      setBotStats(data);
    } catch (error) {
      console.error('Error fetching bot stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBotStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Bot istatistikleri yükleniyor...</p>
      </div>
    );
  }

  if (!botStats) return <div>Veri bulunamadı</div>;

  return (
    <div className="space-y-6">
      {/* Bot İstatistikleri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bot Tespit Yöntemleri</CardTitle>
          </CardHeader>
          <CardContent>
            {botStats.detectionMethods.length > 0 ? (
              <div className="space-y-4">
                {botStats.detectionMethods.map((method) => (
                  <div key={method._id} className="flex justify-between">
                    <span>{method._id}</span>
                    <span className="font-bold">{method.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Henüz bot tespit edilmedi</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>En Aktif Bot IP'leri</CardTitle>
          </CardHeader>
          <CardContent>
            {botStats.topIPs.length > 0 ? (
              <div className="space-y-2">
                {botStats.topIPs.map((ip) => (
                  <div key={ip._id} className="flex justify-between text-sm">
                    <span className="font-mono">{ip._id}</span>
                    <span className="text-red-600">{ip.count} saldırı</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Henüz bot IP'si tespit edilmedi</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proof-of-Work Başarı Oranı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {botStats.proofOfWork.total > 0 
                  ? ((botStats.proofOfWork.solved / botStats.proofOfWork.total) * 100).toFixed(1)
                  : 0}%
              </div>
              <div className="text-sm text-muted-foreground">
                Başarılı çözüm oranı
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Google Ads Tab Component
const GoogleAdsTab = () => {
  const [googleAdsStats, setGoogleAdsStats] = useState<GoogleAdsStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchGoogleAdsStats = async () => {
    try {
      setLoading(true);
      const data = await apiService.getGoogleAdsStats(7);
      setGoogleAdsStats(data);
    } catch (error) {
      console.error('Error fetching Google Ads stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoogleAdsStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Google Ads verileri yükleniyor...</p>
      </div>
    );
  }

  if (!googleAdsStats) return <div>Veri bulunamadı</div>;

  return (
    <div className="space-y-6">
      {/* Google Ads Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Google Ads Click Oranı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {googleAdsStats.overall.totalClicks > 0 
                ? ((googleAdsStats.overall.totalClicks / googleAdsStats.overall.totalClicks) * 100).toFixed(1)
                : 0}%
            </div>
            <div className="text-sm text-muted-foreground">
              {googleAdsStats.overall.totalClicks.toLocaleString()} toplam click
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Ads Bot Oranı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{googleAdsStats.overall.botRate}%</div>
            <div className="text-sm text-muted-foreground">
              {googleAdsStats.overall.botClicks} bot tespit edildi
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktif Kampanyalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{googleAdsStats.campaigns.length}</div>
            <div className="text-sm text-muted-foreground">
              Son 7 günde
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Google Ads Detay Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle>Google Ads Click Detayları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Kampanya</th>
                  <th className="text-left p-2">Click Sayısı</th>
                  <th className="text-left p-2">Bot Click</th>
                  <th className="text-left p-2">Bot Oranı</th>
                </tr>
              </thead>
              <tbody>
                {googleAdsStats.campaigns.map((campaign) => (
                  <tr key={campaign._id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2 font-medium">{campaign._id || 'N/A'}</td>
                    <td className="p-2">{campaign.clicks}</td>
                    <td className="p-2 text-red-600">{campaign.botClicks}</td>
                    <td className="p-2">
                      {campaign.clicks > 0 
                        ? ((campaign.botClicks / campaign.clicks) * 100).toFixed(1)
                        : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

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
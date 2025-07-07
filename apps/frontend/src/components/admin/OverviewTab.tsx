import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, Bot, AlertTriangle, Globe, Clock, BarChart3, Eye } from 'lucide-react';
import { AdminStats } from '@/services/api';

type OverviewTabProps = { stats: AdminStats | null };

const OverviewTab: React.FC<OverviewTabProps> = ({ stats }) => {
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

export default OverviewTab; 
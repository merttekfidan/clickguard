import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { apiService, GoogleAdsStats } from '@/services/api';

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

export default GoogleAdsTab; 
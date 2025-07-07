import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { apiService, DomainStats } from '@/services/api';

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

export default DomainAnalysisTab; 
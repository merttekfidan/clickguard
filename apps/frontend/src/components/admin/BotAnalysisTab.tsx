import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { apiService, BotStats } from '@/services/api';

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

export default BotAnalysisTab; 
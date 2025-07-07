import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { apiService, AdminLog } from '@/services/api';

// Helper to get flag emoji from country code
const getFlagEmoji = (countryCode?: string) =>
  countryCode
    ? String.fromCodePoint(...[...countryCode.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
    : '';

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
      console.log('Raw decision values:', result.logs.map(log => String(log.decision)));
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
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-4">
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
                  <th className="text-left p-2">VPN/ISP</th>
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
                    <td className="p-2 text-sm font-mono">
                      <span>
                        {getFlagEmoji(log.ipInfo?.countryCode)} {log.ipAddress}
                        {log.ipInfo?.lat != null && log.ipInfo?.lon != null && (
                          <a
                            href={`https://www.google.com/maps?q=${log.ipInfo.lat.toString()},${log.ipInfo.lon.toString()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="View on Google Maps"
                            className="ml-2 text-blue-500 hover:underline"
                          >
                            📍
                          </a>
                        )}
                      </span>
                    </td>
                    <td className="p-2">
                      <span
                        className={
                          String(log.decision).toLowerCase() === 'allow'
                            ? 'inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 font-bold text-xs'
                            : 'inline-block px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold text-xs'
                        }
                      >
                        {String(log.decision).toUpperCase() || 'N/A'}
                      </span>
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
                    <td className="p-2 text-sm">
                      {(() => {
                        const isp = log.ipInfo?.isp || 'Unknown';
                        const org = log.ipInfo?.org || '';
                        const isVpn =
                          (isp && isp.toLowerCase().includes('vpn')) ||
                          (org && org.toLowerCase().includes('vpn'));
                        return isVpn ? (
                          <span className="text-red-600 font-bold">VPN</span>
                        ) : (
                          <span>{isp}</span>
                        );
                      })()}
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
      </div>
    </div>
  );
};

export default RealtimeLogsTab; 
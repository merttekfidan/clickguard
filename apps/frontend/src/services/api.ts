const API_BASE_URL = import.meta.env.VITE_BACKEND_URL + '/api/v1';

export interface AdminStats {
  totalClicks: {
    total: number;
    today: number;
    week: number;
    month: number;
  };
  botDetections: {
    total: number;
    today: number;
    rate: string;
  };
  activeDomains: number;
  googleAds: {
    clicks: number;
    rate: string;
  };
  honeypot: {
    total: number;
    today: number;
  };
  proofOfWork: {
    total: number;
    solved: number;
    successRate: string;
  };
}

export interface AdminLog {
  _id: string;
  timestamp: string;
  sessionId: string;
  ipAddress: string;
  isGoogleAds: boolean;
  method: string;
  url: string;
  query: string;
  referrer?: string;
  domain: string;
  decision?: string;
  reason?: string;
  block_type?: string;
}

export interface DomainStats {
  _id: string;
  domain: string;
  totalClicks: number;
  botClicks: number;
  googleAdsClicks: number;
  botRate: number;
  googleAdsRate: number;
  lastClick: string;
  uniqueIPs: number;
}

export interface BotStats {
  detectionMethods: Array<{
    _id: string;
    count: number;
  }>;
  topIPs: Array<{
    _id: string;
    count: number;
    firstAttack: string;
    lastAttack: string;
    domains: number;
  }>;
  proofOfWork: {
    total: number;
    solved: number;
  };
}

export interface GoogleAdsStats {
  overall: {
    totalClicks: number;
    botClicks: number;
    botRate: string;
  };
  campaigns: Array<{
    _id: string;
    clicks: number;
    botClicks: number;
  }>;
  dailyTrend: Array<{
    _id: string;
    allowed: number;
    blocked: number;
  }>;
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      headers,
      ...options,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  // Admin Stats
  async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>('/tracker/admin/stats');
  }

  // Admin Logs
  async getAdminLogs(params?: {
    page?: number;
    limit?: number;
    domain?: string;
    decision?: string;
    startDate?: string;
    endDate?: string;
    isGoogleAds?: boolean;
  }): Promise<{
    logs: AdminLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = searchParams.toString();
    const endpoint = `/tracker/admin/logs${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  // Domain Stats
  async getDomainStats(days: number = 7): Promise<DomainStats[]> {
    return this.request<DomainStats[]>(`/tracker/admin/domains?days=${days}`);
  }

  // Domain Details
  async getDomainDetails(domainId: string, days: number = 30): Promise<{
    domain: string;
    dailyStats: Array<{
      _id: string;
      allowed: number;
      blocked: number;
    }>;
  }> {
    return this.request(`/tracker/admin/domains/${domainId}?days=${days}`);
  }

  // Bot Stats
  async getBotStats(days: number = 7): Promise<BotStats> {
    return this.request<BotStats>(`/tracker/admin/bots?days=${days}`);
  }

  // Bot IP Details
  async getBotIPDetails(ipAddress: string, days: number = 30): Promise<{
    ipAddress: string;
    dailyStats: Array<{
      _id: string;
      attacks: Array<{
        blockType: string;
        count: number;
        domains: string[];
      }>;
      totalAttacks: number;
    }>;
  }> {
    return this.request(`/tracker/admin/bots/ip/${ipAddress}?days=${days}`);
  }

  // Google Ads Stats
  async getGoogleAdsStats(days: number = 7): Promise<GoogleAdsStats> {
    return this.request<GoogleAdsStats>(`/tracker/admin/google-ads?days=${days}`);
  }

  // Google Ads Campaigns
  async getGoogleAdsCampaigns(days: number = 30): Promise<Array<{
    campaign: string;
    source: string;
    medium: string;
    clicks: number;
    botClicks: number;
    botRate: number;
    lastClick: string;
  }>> {
    return this.request(`/tracker/admin/google-ads/campaigns?days=${days}`);
  }
}

export const apiService = new ApiService(); 
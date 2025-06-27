import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, ExternalLink, CheckCircle, Clock, XCircle } from 'lucide-react';

interface GoogleAdsAccount {
  id: string;
  customerId: string;
  name: string;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'REFUSED' | 'CANCELLED';
  isActive: boolean;
  lastSyncAt?: string;
  settings?: Record<string, unknown>;
}

const GoogleAdsConnect: React.FC = () => {
  const [connectedAccounts, setConnectedAccounts] = useState<GoogleAdsAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestLoggingIn, setIsTestLoggingIn] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  const isDevelopment = import.meta.env.DEV;

  useEffect(() => {
    loadConnectedAccounts();
  }, []);

  const loadConnectedAccounts = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${backendUrl}/api/v1/google-ads/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnectedAccounts(data.accounts || []);
      } else {
        console.error('Failed to load accounts:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading connected accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setIsTestLoggingIn(true);
    try {
      const response = await fetch(`${backendUrl}/api/v1/auth/test-login`);
      if (response.ok) {
        const data = await response.json();
        
        // Store the token
        localStorage.setItem('authToken', data.token);
        
        toast({
          title: "Success!",
          description: "Test login successful. You can now connect Google Ads accounts.",
        });
        
        // Reload the page to update the UI
        window.location.reload();
      } else {
        throw new Error('Test login failed');
      }
    } catch (error) {
      console.error('Error during test login:', error);
      toast({
        title: "Error",
        description: "Test login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTestLoggingIn(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${backendUrl}/api/v1/google-ads/account/${accountId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Google Ads account disconnected successfully.",
        });
        loadConnectedAccounts();
      } else {
        throw new Error('Failed to disconnect account');
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatCustomerId = (customerId: string) => {
    // Format as XXX-XXX-XXXX
    return customerId.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'REFUSED':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Refused</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-gray-600">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleConnectNew = () => {
    navigate('/connect-account');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading accounts...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Development Test Login */}
      {isDevelopment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Development Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTestLogin} 
              disabled={isTestLoggingIn}
              variant="outline"
            >
              {isTestLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Test Login'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connected Accounts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Connected Google Ads Accounts</CardTitle>
          <Button onClick={handleConnectNew} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Connect Account
          </Button>
        </CardHeader>
        <CardContent>
          {connectedAccounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <ExternalLink className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Google Ads accounts connected</p>
                <p className="text-sm">Connect your first Google Ads account to get started with ClickGuard.</p>
              </div>
              <Button onClick={handleConnectNew}>
                <Plus className="w-4 h-4 mr-2" />
                Connect Your First Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {connectedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-medium">{account.name}</h3>
                      <p className="text-sm text-gray-500">
                        ID: {formatCustomerId(account.customerId)}
                      </p>
                      {account.lastSyncAt && (
                        <p className="text-xs text-gray-400">
                          Last synced: {new Date(account.lastSyncAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(account.status)}
                    
                    {account.status === 'ACTIVE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(account.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                1
              </div>
              <h4 className="font-medium">Enter Customer ID</h4>
              <p className="text-sm text-gray-600">Provide your Google Ads Customer ID in the format XXX-XXX-XXXX</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                2
              </div>
              <h4 className="font-medium">Approve Request</h4>
              <p className="text-sm text-gray-600">Check your Google Ads account and approve the link request from ClickGuard</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                3
              </div>
              <h4 className="font-medium">Start Protecting</h4>
              <p className="text-sm text-gray-600">Your account is now connected and ClickGuard can protect your campaigns</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleAdsConnect; 
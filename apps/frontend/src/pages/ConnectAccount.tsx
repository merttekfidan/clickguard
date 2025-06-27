import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const POLL_INTERVAL = 30000; // 30 seconds

type Status = 'PENDING_APPROVAL' | 'ACTIVE' | 'REFUSED' | 'CANCELLED' | null;

// Helper to decode JWT and extract userId
function getUserIdFromToken(token: string | null): string {
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id || payload.sub || '';
  } catch {
    return '';
  }
}

const ConnectAccount: React.FC = () => {
  const [googleAdsId, setGoogleAdsId] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // On mount, extract userId from authToken
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/');
      return;
    }
    setUserId(getUserIdFromToken(token));
  }, [navigate]);

  // Validate Google Ads Customer ID format
  const validateCustomerId = (customerId: string): boolean => {
    const cleanId = customerId.replace(/-/g, '');
    return /^\d{10}$/.test(cleanId);
  };

  // Format customer ID for display
  const formatCustomerId = (customerId: string): string => {
    const cleanId = customerId.replace(/-/g, '');
    if (cleanId.length === 10) {
      return `${cleanId.slice(0, 3)}-${cleanId.slice(3, 6)}-${cleanId.slice(6)}`;
    }
    return customerId;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!userId) throw new Error('User not authenticated. Please log in.');
      
      if (!validateCustomerId(googleAdsId)) {
        throw new Error('Invalid Google Ads Customer ID format. Please use format: XXX-XXX-XXXX');
      }

      const token = localStorage.getItem('authToken');
      const res = await fetch(`${backendUrl}/api/v1/accounts/link`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ googleAdsId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to send link request');
      
      setStatus('PENDING_APPROVAL');
      startPolling();
      
      toast({
        title: "Link Request Sent!",
        description: "The client will receive a notification in their Google Ads account to approve the request.",
      });

    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Unknown error occurred');
      
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Poll for status
  const pollStatus = async () => {
    if (!googleAdsId) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${backendUrl}/api/v1/accounts/status/${googleAdsId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (res.ok && data.status) {
        setStatus(data.status);
        
        if (data.status === 'ACTIVE') {
          stopPolling();
          toast({
            title: "Account Linked Successfully!",
            description: "Your Google Ads account is now connected to ClickGuard.",
          });
          // Redirect to dashboard after successful connection
          setTimeout(() => navigate('/'), 2000);
        } else if (data.status === 'REFUSED') {
          stopPolling();
          toast({
            title: "Link Request Declined",
            description: "The client has declined the link request. You can try again or contact support.",
            variant: "destructive",
          });
        } else if (data.status === 'CANCELLED') {
          stopPolling();
          toast({
            title: "Link Cancelled",
            description: "The link has been cancelled. You can try linking again.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(pollStatus, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  // Handle input change with formatting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCustomerId(value);
    setGoogleAdsId(formatted);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'ACTIVE':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'REFUSED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'CANCELLED':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'Waiting for client approval in Google Ads account...';
      case 'ACTIVE':
        return 'Account successfully linked!';
      case 'REFUSED':
        return 'Link request was declined by the client.';
      case 'CANCELLED':
        return 'Link request was cancelled.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Connect Google Ads Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!status ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleAdsId">Google Ads Customer ID</Label>
                <Input
                  id="googleAdsId"
                  type="text"
                  placeholder="XXX-XXX-XXXX"
                  value={googleAdsId}
                  onChange={handleInputChange}
                  maxLength={12}
                  disabled={loading}
                  required
                />
                <p className="text-sm text-gray-500">
                  Enter your Google Ads Customer ID in the format XXX-XXX-XXXX
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !googleAdsId}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Link Request...
                  </>
                ) : (
                  'Send Link Request'
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  After submitting, you'll receive a notification in your Google Ads account to approve the link request.
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                {getStatusIcon()}
                <span className="font-medium">{getStatusMessage()}</span>
              </div>

              {status === 'PENDING_APPROVAL' && (
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600">
                    Please check your Google Ads account and approve the link request from ClickGuard.
                  </p>
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-gray-500">Checking status...</span>
                  </div>
                </div>
              )}

              {(status === 'REFUSED' || status === 'CANCELLED') && (
                <div className="space-y-4">
                  <Button 
                    onClick={() => {
                      setStatus(null);
                      setError(null);
                    }}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                </div>
              )}

              {status === 'ACTIVE' && (
                <div className="text-center">
                  <Button 
                    onClick={() => navigate('/')}
                    className="w-full"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectAccount; 
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const AuthSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      localStorage.setItem('authToken', token);
      toast({
        title: "Authentication Successful!",
        description: "Now, please select which Google Ads account to connect.",
      });
      // Redirect to the account selection page
      navigate('/connect-account');
    } else {
      toast({
        title: "Authentication Error",
        description: "No authentication token was received from Google.",
        variant: "destructive",
      });
      navigate('/auth/error');
    }
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-lg">Processing authentication...</span>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthSuccess; 
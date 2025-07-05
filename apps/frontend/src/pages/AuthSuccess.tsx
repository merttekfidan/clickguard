import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const AuthSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        
        if (!token) {
            setStatus('error');
            setMessage('No authentication token received');
            return;
        }

        try {
            // Store token in localStorage
            localStorage.setItem('authToken', token);
            
            // Decode token to get user info (basic decode, not verification)
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            
            setStatus('success');
            setMessage(`Welcome, ${tokenPayload.displayName || tokenPayload.email}!`);
            
            // Redirect to admin dashboard after 2 seconds
            setTimeout(() => {
                navigate('/admin');
            }, 2000);
            
        } catch (error) {
            console.error('Token processing error:', error);
            setStatus('error');
            setMessage('Invalid authentication token');
        }
    }, [searchParams, navigate]);

    const handleGoToDashboard = () => {
        navigate('/admin');
    };

    const handleTryAgain = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">
                        Authentication
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                            <p className="text-gray-600">Processing authentication...</p>
                        </div>
                    )}
                    
                    {status === 'success' && (
                        <div className="flex flex-col items-center space-y-4">
                            <CheckCircle className="h-12 w-12 text-green-600" />
                            <p className="text-green-600 font-medium">{message}</p>
                            <p className="text-sm text-gray-500 text-center">
                                You will be redirected to the admin dashboard automatically.
                            </p>
                            <Button onClick={handleGoToDashboard} className="w-full">
                                Go to Dashboard
                            </Button>
                        </div>
                    )}
                    
                    {status === 'error' && (
                        <div className="flex flex-col items-center space-y-4">
                            <AlertCircle className="h-12 w-12 text-red-600" />
                            <p className="text-red-600 font-medium">{message}</p>
                            <p className="text-sm text-gray-500 text-center">
                                Please try logging in again.
                            </p>
                            <Button onClick={handleTryAgain} variant="outline" className="w-full">
                                Try Again
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AuthSuccess; 
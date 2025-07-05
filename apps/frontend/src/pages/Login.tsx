import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Chrome } from 'lucide-react';

const Login: React.FC = () => {
    const handleGoogleLogin = () => {
        // Redirect to backend Google OAuth endpoint
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        window.location.href = `${backendUrl}/api/v1/auth/google`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold text-gray-900">
                        ClickGuard
                    </CardTitle>
                    <p className="text-gray-600 mt-2">
                        Sign in to access your admin dashboard
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <Button 
                            onClick={handleGoogleLogin}
                            className="w-full h-12 text-base font-medium"
                            variant="outline"
                        >
                            <Chrome className="mr-3 h-5 w-5" />
                            Continue with Google
                        </Button>
                    </div>
                    
                    <div className="text-center">
                        <p className="text-sm text-gray-500">
                            By signing in, you agree to our terms of service and privacy policy.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Login; 
import React, { useState } from 'react';

const API_BASE = '/api/v1/google-ads/auth';

const GoogleAdsAuthDebug: React.FC = () => {
  const [authUrl, setAuthUrl] = useState('');
  const [token, setToken] = useState<object | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  const fetchAuthUrl = async () => {
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/url`);
      const data = await res.json();
      setAuthUrl(data.url);
      setStatus('success');
    } catch (err) {
      setError('Failed to fetch auth URL');
      setStatus('error');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyMsg('Copied!');
    setTimeout(() => setCopyMsg(''), 1500);
  };

  const fetchTokenStatus = async () => {
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/token`);
      const data = await res.json();
      setToken(data.token || null);
      setStatus('success');
    } catch (err) {
      setError('Failed to fetch token status');
      setStatus('error');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-10">
      <h1 className="text-2xl font-bold mb-4">Google Ads Auth Debug/Test</h1>
      <ol className="list-decimal ml-6 space-y-4">
        <li>
          <div className="font-semibold">Step 1: Get Google Auth URL</div>
          <button
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={fetchAuthUrl}
            aria-label="Get Google Auth URL"
            tabIndex={0}
          >
            Get Auth URL
          </button>
          {authUrl && (
            <div className="mt-2 flex items-center space-x-2">
              <input
                className="w-full px-2 py-1 border rounded"
                value={authUrl}
                readOnly
                aria-label="Google Auth URL"
              />
              <button
                className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => handleCopy(authUrl)}
                aria-label="Copy Auth URL"
                tabIndex={0}
              >Copy</button>
              {copyMsg && <span className="text-green-600 text-sm">{copyMsg}</span>}
            </div>
          )}
          <div className="text-sm text-gray-600 mt-1">
            Click the button to get the Google OAuth2 consent URL. Open it in your browser, log in, and approve access. You will see a success message when authentication is complete.
          </div>
        </li>
        <li>
          <div className="font-semibold">Step 2: Check Auth Status</div>
          <button
            className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            onClick={fetchTokenStatus}
            aria-label="Check Auth Status"
            tabIndex={0}
          >
            Check Auth Status
          </button>
          {token && (
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
              {JSON.stringify(token, null, 2)}
            </pre>
          )}
          <div className="text-sm text-gray-600 mt-1">
            Click to see if you are authenticated and view your token (for debugging only).
          </div>
        </li>
      </ol>
      {status === 'loading' && <div className="mt-4 text-blue-600">Loading...</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
};

export default GoogleAdsAuthDebug; 
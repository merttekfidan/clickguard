/**
 * ClickGuard IP Tracker
 * A lightweight script to collect user IP data for analytics
 * 
 * Usage: Include this script in your website
 * <script src="https://your-backend-domain.com/api/v1/tracker/script"></script>
 */

console.log('TEST: clickguard-tracker.js loaded');

(function() {
    'use strict';
    console.debug('[DEBUG 1] IIFE started');
    
    // Dynamically determine the backend endpoint based on the script src
    const scriptTag = document.currentScript || document.querySelector('script[src*="tracker/script"]');
    let backendOrigin = '';
    if (scriptTag) {
        try {
            const url = new URL(scriptTag.src, window.location.origin);
            backendOrigin = url.origin;
        } catch (e) {
            backendOrigin = window.location.origin;
        }
    } else {
        backendOrigin = window.location.origin;
    }
    // Fallback for local file testing
    if (window.location.protocol === 'file:' || window.location.hostname === '') {
        backendOrigin = 'http://localhost:3001';
    }
    const CONFIG = {
        endpoint: backendOrigin + '/api/v1/tracker',
        timeout: 5000,
        retryAttempts: 3,
        retryDelay: 1000
    };
    console.debug('[DEBUG 2] Config:', CONFIG);
    
    // Track if we've already sent data for this page load
    let hasTracked = false;
    
    // Check if we're on the script endpoint itself (prevent loops)
    const isScriptEndpoint = window.location.pathname.includes('/api/v1/tracker/script');
    console.debug('[DEBUG 3] isScriptEndpoint:', isScriptEndpoint);
    
    // Generate unique session ID
    const generateSessionId = () => {
        const id = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        console.debug('[DEBUG 4] Generated sessionId:', id);
        return id;
    };
    
    // Get current session ID or create new one
    const getSessionId = () => {
        let sessionId = localStorage.getItem('clickguard_session_id');
        if (!sessionId) {
            sessionId = generateSessionId();
            localStorage.setItem('clickguard_session_id', sessionId);
            console.debug('[DEBUG 5] New sessionId set:', sessionId);
        } else {
            console.debug('[DEBUG 6] Existing sessionId:', sessionId);
        }
        return sessionId;
    };
    
    // SHA-256 hash function (browser native)
    async function sha256(str) {
        const buf = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Canvas fingerprinting
    async function getCanvasFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125,1,62,20);
        ctx.fillStyle = '#069';
        ctx.fillText('ClickGuard', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('ClickGuard', 4, 17);
        const dataUrl = canvas.toDataURL();
        return await sha256(dataUrl);
    }
    
    // Enhanced collectUserData
    const collectUserData = async () => {
        const canvasFingerprint = await getCanvasFingerprint();
        const data = {
            sessionId: getSessionId(),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language || navigator.userLanguage,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: {
                width: window.screen.width,
                height: window.screen.height
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            referrer: document.referrer,
            url: window.location.href,
            domain: window.location.hostname,
            path: window.location.pathname,
            query: window.location.search,
            hash: window.location.hash,
            canvasFingerprint
        };
        console.debug('[DEBUG 7] Collected user data:', data);
        return data;
    };
    
    // Send data to server
    const sendData = async (data, attempt = 1) => {
        try {
            console.debug(`[DEBUG 8] Sending page view data (attempt ${attempt})...`, data);
            
            const response = await fetch(CONFIG.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-ClickGuard-Version': '1.0.0'
                },
                body: JSON.stringify(data),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.debug('[DEBUG 9] Page view data sent successfully', result);
            return result;
            
        } catch (error) {
            console.warn(`[DEBUG 10] Attempt ${attempt} failed:`, error.message);
            
            if (attempt < CONFIG.retryAttempts) {
                const delay = CONFIG.retryDelay * Math.pow(2, attempt - 1);
                console.debug(`[DEBUG 11] Retrying in ${delay}ms...`);
                
                setTimeout(() => {
                    sendData(data, attempt + 1);
                }, delay);
            } else {
                console.error('[DEBUG 12] All retry attempts failed');
            }
        }
    };
    
    // Track page view (only once per page load)
    const trackPageView = async () => {
        if (isScriptEndpoint) {
            console.debug('[DEBUG 13] Skipping tracking on script endpoint');
            return;
        }
        if (hasTracked) {
            console.debug('[DEBUG 14] Page already tracked, skipping...');
            return;
        }
        hasTracked = true;
        console.debug('[DEBUG 15] Starting page view tracking...');
        const userData = await collectUserData();
        sendData(userData);
    };
    
    // Initialize tracking
    const init = () => {
        console.debug('[DEBUG 16] Initializing...');
        trackPageView();
        console.debug('[DEBUG 17] Page view tracking initialized');
    };
    
    // Expose minimal public API
    window.ClickGuard = {
        getSessionId: getSessionId
    };
    
    // Log window events
    window.addEventListener('DOMContentLoaded', function() {
        console.debug('[DEBUG 18] DOMContentLoaded event fired');
    });
    window.addEventListener('load', function() {
        console.debug('[DEBUG 19] load event fired');
    });
    
    // Log if running in top window or iframe
    if (window.top === window.self) {
        console.debug('[DEBUG 20] Running in top window');
    } else {
        console.debug('[DEBUG 21] Running in iframe');
    }
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
        console.debug('[DEBUG 22] Waiting for DOMContentLoaded');
    } else {
        init();
        console.debug('[DEBUG 23] DOM already ready, initialized immediately');
    }
    
    // Log script execution end
    console.debug('[DEBUG 24] IIFE end');
    
})(); 
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
    
    // Configuration
    const CONFIG = {
        endpoint: 'https://0e7f-185-221-26-3.ngrok-free.app/api/v1/tracker',
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
    
    // Collect user data
    const collectUserData = () => {
        const data = {
            sessionId: getSessionId(),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language || navigator.userLanguage,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: {
                width: screen.width,
                height: screen.height
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
            hash: window.location.hash
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
    const trackPageView = () => {
        // Don't track if we're on the script endpoint itself
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
        const userData = collectUserData();
        sendData(userData);
    };
    
    // Initialize tracking
    const init = () => {
        console.debug('[DEBUG 16] Initializing...');
        // Only track the initial page view
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
# ClickGuard Tracker Module

A lightweight, plug-and-play tracking solution for collecting user IP, session, and page analytics from any website.

---

## Features
- **IP Address Collection**: Captures real client IPs (IPv4/IPv6 supported)
- **Session Tracking**: Unique session IDs per user
- **Page View Analytics**: Tracks page views automatically
- **Device Fingerprinting**: Combines browser, language, timezone, and canvas fingerprint for robust identification
- **IP Enrichment**: Uses ip-api.com to enrich click data with geolocation and ISP info
- **Fraud Detection Rules**: In-memory device frequency, IP type, and subnet analysis
- **In-Memory Storage**: No database required for basic analytics
- **Easy Integration**: Just add a script tag to your site
- **Test Page**: Built-in test page for quick validation
- **Step-by-Step Debug Logging**: Console logs for every analysis step

---

## Analysis Pipeline
1. **Tracking data received**: All tracker data is processed on arrival.
2. **IP enrichment**: The backend fetches geolocation/ISP info from ip-api.com.
3. **Device fingerprinting**: A SHA-256 hash is generated from browser, language, timezone, and canvas fingerprint.
4. **Frequency & subnet tracking**: In-memory counters track device and /16 subnet activity.
5. **Rule engine**: Applies fraud rules (allowlist, device frequency, /16 subnet fraud) and returns a decision.
6. **Debug logging**: Each step is logged for transparency. Blocked logs show only IP/proxy info, with colored output.

---

## API Endpoints

### `POST /api/v1/tracker`
- Receives tracking data from the client script.
- Runs the full analysis pipeline and logs all steps.
- Returns `{ success, sessionId, timestamp, ipAddress }`.

### `GET /api/v1/tracker/stats`
- Returns basic in-memory tracking statistics.

### `GET /api/v1/tracker/script`
- Serves the tracking JavaScript (`clickguard-tracker.js`).
- Add this to your site to enable tracking.

### `GET /api/v1/tracker/test`
- Serves a test HTML page (`test-tracker.html`) for local or remote testing.

---

## How to Use

### 1. **Include the Tracking Script**
Add this to your website (update the domain as needed):
```html
<script src="https://your-backend.com/api/v1/tracker/script"></script>
```

**The script is universal:** It automatically detects the backend endpoint from its own src URL. No manual endpoint configuration is needed.

### 2. **Automatic Page View Tracking**
The script will automatically send a page view event on load. No extra code needed.

### 3. **Access the Test Page**
Visit `/api/v1/tracker/test` on your backend to see a demo and test tracking.

### 4. **Get Session ID (Optional)**
```js
const sessionId = ClickGuard.getSessionId();
```

---

## Data Collected
- IP Address (from backend)
- User Agent
- Session ID
- Page URL, domain, referrer
- Screen resolution, viewport
- Timezone, language
- Canvas fingerprint
- Device fingerprint (SHA-256 hash)
- IP enrichment (geo, ISP, org)
- Timestamp

---

## Fraud Detection Rules
- **IP Type Analysis**: Allows only if the ISP/org (from ip-api.com) contains any of the allowed Polish ISP/org names (case-insensitive, substring match)
- **Device Frequency Analysis**: Blocks if the same device fingerprint is seen >3 times (Google Ads clicks only)
- **CIDR Range Analysis**: Blocks if >2 frauds are detected from the same /16 subnet

---

## File Structure
```
modules/tracker/
├── index.js              # Module exports
├── routes.js             # API routes
├── controller.js         # Request handlers (handles IP extraction, etc.)
├── service.js            # In-memory storage and analytics
├── public/
│   ├── clickguard-tracker.js   # Client-side tracking script
│   └── test-tracker.html       # Test/demo page
└── README.md             # This file
```

---

## Tracking Script: `clickguard-tracker.js`
- Loads automatically when included via `<script src=...>`
- **Dynamically detects the backend endpoint** based on its own src URL (no config needed)
- Sends a POST to `/api/v1/tracker` with session, page, browser info, and canvas fingerprint
- Exposes `ClickGuard.getSessionId()` for custom use
- Designed for cross-origin and production use (CORS must be enabled on backend)

---

## Test Page: `test-tracker.html`
- Demonstrates how to embed and use the tracker
- Provides UI to test session ID, stats, and reload tracking
- Logs all console output to the page for easy debugging

---

## Deployment Notes
- For production, serve the backend and script over HTTPS
- Update CORS policy as needed for your domains
- For local testing, use LAN IP or tunneling (e.g., ngrok) for cross-device access

---

## Example Integration
```html
<!-- On your site -->
<script src="https://yourdomain.com/api/v1/tracker/script"></script>
```

---

For more details, see the code and comments in each file.

## Deployment
See the main backend [README.md](../../README.md) for deployment instructions and best practices. 
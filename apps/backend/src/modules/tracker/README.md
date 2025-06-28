# ClickGuard Tracker Module

A lightweight, plug-and-play tracking solution for collecting user IP, session, and page analytics from any website.

---

## Features
- **IP Address Collection**: Captures real client IPs (IPv4/IPv6 supported)
- **Session Tracking**: Unique session IDs per user
- **Page View Analytics**: Tracks page views automatically
- **In-Memory Storage**: No database required for basic analytics
- **Easy Integration**: Just add a script tag to your site
- **Test Page**: Built-in test page for quick validation

---

## API Endpoints

### `POST /api/v1/tracker`
- Receives tracking data from the client script.
- Stores data in memory (see `service.js`).
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
<script src="/api/v1/tracker/script"></script>
```
Or, for remote/local testing:
```html
<script src="http://YOUR-BACKEND-DOMAIN:PORT/api/v1/tracker/script"></script>
```

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
- Timestamp

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
- Sends a POST to `/api/v1/tracker` with session, page, and browser info
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
# ClickGuard Backend

## Overview
ClickGuard is an advanced click-fraud and bot detection backend for Google Ads and web analytics. It uses device fingerprinting, IP/subnet analysis, honeypot, and proof-of-work to block malicious clicks in real time.

## Key Features (2024-07-03)
- **Advanced Device Fingerprinting**: Hybrid approach, no userAgent, 80% hard-to-spoof.
- **MongoDB Atlas**: All click logs stored securely.
- **Modular Anti-Bot**: Honeypot and Proof-of-Work (PoW) modules.
- **Smart Sledgehammer Model**: Blocks IPs/subnets for Google Ads abuse, allowlist for trusted ISPs.
- **Production Ready**: Render.com configs, CORS, health check, env-based secrets.
- **Privacy First**: No direct personal data, GDPR/KVKK compliant with consent.

## Quick Start
1. Clone repo and install dependencies:
   ```sh
   cd apps/backend
   npm install
   ```
2. Copy `.env.example` to `.env` and set `MONGO_URI`, etc.
3. Start server:
   ```sh
   npm start
   ```
4. For production, deploy to Render.com and set all secrets in dashboard.

## Configuration
- **MongoDB**: Set `MONGO_URI` in `.env`.
- **Anti-Bot**: Configure in `src/modules/tracker/config.js`.
- **Allowlist**: Edit `cloud_keywords.json` for trusted ISPs.
- **CORS**: Set allowed origins in `src/app.js`.

## Endpoints
- `/api/v1/tracker` (POST): Main click endpoint
- `/api/v1/tracker/script`: Tracking script
- `/api/v1/tracker/test`: Test page
- `/api/v1/google-ads/...`: Google Ads endpoints
- `/api/health`: Health check

## Admin Dashboard Endpoints
- `/api/v1/tracker/admin/stats`: Genel istatistikler
- `/api/v1/tracker/admin/logs`: Tüm tıklama logları (filtrelenebilir)
- `/api/v1/tracker/admin/domains`: Domain bazlı istatistikler
- `/api/v1/tracker/admin/bots`: Bot analizleri
- `/api/v1/tracker/admin/google-ads`: Google Ads tıklama ve bot istatistikleri

## Privacy & Legal
- No userAgent or direct personal data in fingerprint.
- All data hashed/anonymized except IP (required for anti-fraud).
- GDPR/KVKK compliant with user consent.

## See Also
- [DOCUMENTATION.md](./DOCUMENTATION.md) for full technical details
- [DEPLOYMENT_LOG.md](./DEPLOYMENT_LOG.md) for deployment notes 
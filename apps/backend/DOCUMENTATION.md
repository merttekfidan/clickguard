# ClickGuard Backend Documentation

## Major Features & Architecture (2024-07-03 Session)

### 1. Advanced Device Fingerprinting
- Uses a hybrid "sepet" approach: %80 hard-to-spoof (canvas, webgl, audio, hardware info), %20 easy-to-spoof (language, timezone, screen, platform).
- **userAgent** is NOT used in the fingerprint (removed for privacy and anti-bot evasion).
- Device fingerprint is generated on the frontend and sent as `deviceFingerprint`.
- See `clickguard-tracker.js` for implementation.

### 2. MongoDB Atlas Integration
- All click logs are stored in MongoDB Atlas using the `ClickLog` model.
- Connection string is set via `MONGO_URI` in `.env`.
- See `src/models/ClickLog.js` and `src/config/mongo.js`.

### 3. Modular Anti-Bot System
- **Honeypot**: Hidden field in payload, triggers PoW if filled.
- **Proof-of-Work (PoW)**: Client must solve a hash puzzle if suspected as bot.
- Both modules are configurable in `src/modules/tracker/config.js`.
- See `honeypot.service.js` and `proofOfWork.service.js`.

### 4. Render.com Production Readiness
- CORS can be set to allow all or restrict to frontend domain.
- Health check endpoint at `/api/health`.
- All secrets/configs via environment variables.
- Local development IP allow rule is commented out for production.
- See `DEPLOYMENT_LOG.md` for all deployment-specific changes.

### 5. Endpoints Summary
- `/api/v1/tracker` (POST): Main click endpoint
- `/api/v1/tracker/stats`, `/api/v1/tracker/clicks`, `/api/v1/tracker/clicks/:clickId`, `/api/v1/tracker/google-ads-stats`, `/api/v1/tracker/processed-clicks`
- `/api/v1/tracker/script`: Tracking script
- `/api/v1/tracker/test`: Test page
- `/api/v1/google-ads/...`: Google Ads integration endpoints
- `/api/health`: Health check

### 6. Privacy & Legal Considerations
- No userAgent or direct personal data in fingerprint.
- All fingerprint data is hashed and anonymized.
- IP address is stored (required for anti-fraud), but all other data is non-personal.
- Compliant with GDPR/KVKK as long as users are informed and consent is obtained.

### 7. How to Revert to Development Mode
- Uncomment local-dev IP allow rule in `ruleEngine.service.js`.
- Set CORS to allow all origins.
- Use `NODE_ENV=development`, `LOG_LEVEL=debug`.
- Use local `.env` for secrets.

### 8. Admin Dashboard API Endpoints
- `/api/v1/tracker/admin/stats`: Returns overall click/bot stats for dashboard.
- `/api/v1/tracker/admin/logs`: Returns paginated click logs.
- `/api/v1/tracker/admin/domains`: Returns stats per domain.
- `/api/v1/tracker/admin/bots`: Returns bot detection stats.
- `/api/v1/tracker/admin/google-ads`: Returns Google Ads click/bot stats.
- `/api/v1/tracker/admin/google-ads/campaigns`: Returns Google Ads campaign stats.
- `/api/v1/tracker/admin/domains/:domainId`: Returns daily stats for a specific domain.
- `/api/v1/tracker/admin/bots/ip/:ipAddress`: Returns attack stats for a specific bot IP.

---

For further details, see the code in `
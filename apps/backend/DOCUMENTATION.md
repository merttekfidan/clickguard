# ClickGuard Backend Documentation

## Smart Sledgehammer Model (Google Ads Click Protection)

### Overview
The Smart Sledgehammer Model is designed to aggressively block fraudulent or abusive Google Ads clicks using a combination of device fingerprinting and IP/subnet analysis. The model applies only to Google Ads clicks (detected by referrer, gclid, or UTM parameters).

### Blocking Logic

#### 1. Device Fingerprint Frequency (Google Ads Clicks Only)
- If the same device fingerprint is seen **more than 10 times in 5 minutes**:
  - **If all IPs are the same:** Block only that IP (`/32`).
  - **If all IPs share the same first 3 octets (e.g., 1.2.3.X):** Block the `/24` subnet (e.g., `1.2.3.0/24`).
  - **If all IPs share the same first 2 octets (e.g., 1.2.X.Y):** Block the `/16` subnet (e.g., `1.2.0.0/16`).
  - **If the pattern is mixed:** Fallback to blocking only the IP (`/32`).
- This logic is **only applied to Google Ads clicks**.

#### 2. Allowed ISP Check
- If the IP's ISP or organization matches the allowlist in `cloud_keywords.json`, the click is allowed (unless blocked by the fingerprint rule above).

#### 3. Frequency Check (No ISP Info)
- If ISP info is unavailable and the same IP is seen **more than 3 times in 5 minutes**, block only that IP (`/32`).

#### 4. Default Block
- If the IP is not in the allowlist, block the `/16` subnet.

### Google Ads Click Detection
A click is considered a Google Ads click if **any** of the following are true:
- The referrer is a Google Ads-related domain (e.g., `google.com`, `googleadservices.com`, etc.)
- The URL or query string contains a Google Ads click ID (like `gclid`)
- The domain matches a known Google Ads domain

### Logging
- The backend logs every Google Ads click, including device fingerprint analysis and the type of block applied.
- Logs clearly indicate when a block is triggered and what is being blocked (IP, /24, or /16).

### Example Log Entries
```
🚨 Device fingerprint abuse: same IP, blocking /32
🚨 Device fingerprint abuse: /24 pattern, blocking /24
🚨 Device fingerprint abuse: /16 pattern, blocking /16
✅ Device fingerprint frequency OK (Google Ads):
```

### Configuration
- The allowlist for ISPs is managed in `cloud_keywords.json`.
- The device fingerprint threshold is set to 10 clicks in 5 minutes (configurable in code).

## Anti-Bot Features: Honeypot & Proof-of-Work

### Honeypot
- The tracker script sends a hidden honeypot field with every click.
- If a bot fills this field, the backend detects it and triggers a proof-of-work challenge.
- This is a simple, zero-friction way to catch unsophisticated bots.

### Proof-of-Work (PoW) Challenge
- When a honeypot is triggered, the backend responds with a PoW challenge.
- The client must find a nonce so that `SHA256(challenge + sessionId + nonce)` starts with a required prefix (e.g., '0000').
- The tracker script solves this in JavaScript and resends the click with the solution.
- The backend verifies the solution before accepting the click.
- This slows down bots and can peg their CPU at 100% if they try to click rapidly.

#### Configuration
- All anti-bot features are configured in `src/modules/tracker/config.js`:
  - `honeypotEnabled`: Enable/disable honeypot detection
  - `proofOfWorkEnabled`: Enable/disable proof-of-work challenge
  - `powDifficulty`: Number of leading zeros required in the hash (higher = harder)
  - `powPrefixChar`: The character to use for the prefix (default: '0')
- You can also set `CG_POW_DIFFICULTY` in your environment to override the default difficulty.

#### Example Log Entries
```
🪤 Honeypot triggered! Sending proof-of-work challenge to suspected bot: {...}
[DEBUG POW] Proof-of-work challenge received: {...}
[DEBUG POW] Proof-of-work solved, nonce: ...
✅ Proof-of-work solved, click accepted: {...}
❌ Invalid proof-of-work solution! Bot blocked: {...}
```

---

For further details, see the implementation in `honeypot.service.js`, `proofOfWork.service.js`, and the main controller.
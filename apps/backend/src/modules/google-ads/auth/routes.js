const express = require('express');
const router = express.Router();
const authService = require('./service');

// Example: GET /api/v1/google-ads/auth/status
router.get('/status', (req, res) => {
  res.json({
    message: 'Google Ads Auth submodule is working!'
  });
});

// GET /api/v1/google-ads/auth/url
// Returns the Google OAuth2 consent URL
router.get('/url', (req, res) => {
  try {
    const url = authService.getAuthUrl();
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/google-ads/auth/callback
// Handles the OAuth2 redirect, exchanges the code for tokens, and shows a success message
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.status(400).send(`OAuth Error: ${error}`);
  }
  if (!code) {
    return res.status(400).send('No code found in query.');
  }
  try {
    const tokens = await authService.getTokenFromCode(code);
    res.send(`
      <html>
        <body style="font-family: sans-serif;">
          <h2>Google OAuth Success</h2>
          <p>Authentication successful! You may close this window.</p>
          <pre style="font-size:1.2em; background:#f3f3f3; padding:1em; border-radius:6px;">${JSON.stringify(tokens, null, 2)}</pre>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Failed to exchange code for tokens: ' + err.message);
  }
});

// POST /api/v1/google-ads/auth/callback
// Exchanges code for tokens and saves them
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing code in request body' });
  }
  try {
    const tokens = await authService.getTokenFromCode(code);
    res.json({ success: true, tokens });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/google-ads/auth/token
// Checks if a token is saved
router.get('/token', (req, res) => {
  try {
    const token = authService.loadToken();
    if (token) {
      res.json({ authenticated: true, token });
    } else {
      res.json({ authenticated: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 
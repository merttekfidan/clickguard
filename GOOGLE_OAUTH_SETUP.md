# Google OAuth Setup Guide for ClickGuard

This guide helps you set up Google OAuth for user authentication in ClickGuard.

## Prerequisites

- Google account
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (for user profile access)

## Step 2: Create OAuth 2.0 Credentials

1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Configure the OAuth client:
   - **Application type**: Web application
   - **Name**: ClickGuard User Auth
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (development)
     - `https://your-frontend-domain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3001/api/v1/auth/google/callback` (development)
     - `https://your-backend-domain.com/api/v1/auth/google/callback` (production)

## Step 3: Get Your Credentials

After creating the OAuth client, you'll get:
- **Client ID**: `xxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 4: Configure Environment Variables

Create a `.env` file in `apps/backend/` with:

```env
# Google OAuth for User Authentication
GOOGLE_CLIENT_ID=your-client-id-from-step-3
GOOGLE_CLIENT_SECRET=your-client-secret-from-step-3
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

## Step 5: Test the Setup

1. **Start the backend server:**
   ```bash
   cd apps/backend
   npm start
   ```

2. **Test the auth endpoint:**
   ```bash
   curl http://localhost:3001/api/v1/auth/test
   ```

3. **Start the frontend:**
   ```bash
   cd apps/frontend
   npm run dev
   ```

4. **Visit the login page:**
   - Go to `http://localhost:5173/login`
   - Click "Continue with Google"
   - Complete the OAuth flow

## Step 6: Production Deployment

For production deployment on Render:

1. **Update environment variables in Render dashboard:**
   - `GOOGLE_CLIENT_ID`: Your production client ID
   - `GOOGLE_CLIENT_SECRET`: Your production client secret
   - `GOOGLE_CALLBACK_URL`: `https://your-app.onrender.com/api/v1/auth/google/callback`
   - `JWT_SECRET`: Strong secret key
   - `FRONTEND_URL`: Your frontend URL

2. **Update Google OAuth redirect URIs:**
   - Add your production callback URL to Google Cloud Console

## Troubleshooting

### Common Issues:

1. **"Invalid redirect_uri" error:**
   - Check that your callback URL is exactly correct in Google Cloud Console
   - Ensure no trailing slashes or typos

2. **"Client ID not found" error:**
   - Verify your `GOOGLE_CLIENT_ID` environment variable
   - Check that the OAuth client is properly created

3. **"JWT_SECRET not set" error:**
   - Add a strong JWT secret to your environment variables

4. **Frontend can't connect to backend:**
   - Check `VITE_BACKEND_URL` in frontend `.env`
   - Ensure CORS is properly configured

### Testing Commands:

```bash
# Test auth module
curl http://localhost:3001/api/v1/auth/test

# Test protected endpoint (should fail without auth)
curl http://localhost:3001/api/v1/tracker/admin/stats

# Test with valid token (after login)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/v1/tracker/admin/stats
```

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique JWT secrets in production
- Regularly rotate your OAuth client secrets
- Monitor your OAuth usage in Google Cloud Console 
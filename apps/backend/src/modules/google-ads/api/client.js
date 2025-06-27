const { GoogleAdsApi } = require('google-ads-api');
require('dotenv').config();

if (
  !process.env.GOOGLE_ADS_CLIENT_ID ||
  !process.env.GOOGLE_ADS_CLIENT_SECRET ||
  !process.env.GOOGLE_ADS_DEVELOPER_TOKEN
) {
  throw new Error(
    'Missing required Google Ads API credentials in .env file. Please check GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, and GOOGLE_ADS_DEVELOPER_TOKEN.'
  );
}

const googleAdsClient = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

module.exports = googleAdsClient; 
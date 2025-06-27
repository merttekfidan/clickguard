const googleAdsClient = require('./client');

function getCustomer({ customerId, refreshToken, loginCustomerId }) {
  if (!refreshToken) {
    throw new Error('A refresh token is required to make Google Ads API calls.');
  }
  return googleAdsClient.Customer({
    customer_id: customerId,
    refresh_token: refreshToken,
    login_customer_id: loginCustomerId,
  });
}

module.exports = { getCustomer }; 
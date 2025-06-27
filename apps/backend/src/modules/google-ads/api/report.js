const { getCustomer } = require('./customer');

async function runQuery({ customerId, refreshToken, loginCustomerId, query }) {
  try {
    const customer = getCustomer({ customerId, refreshToken, loginCustomerId });
    return await customer.query(query);
  } catch (error) {
    console.error('Error running Google Ads query:', error);
    if (error.message.includes('invalid_grant')) {
      throw new Error(
        'The refresh token is invalid or expired. Please re-authenticate.'
      );
    }
    throw new Error(`Failed to run Google Ads query: ${error.message}`);
  }
}

module.exports = { runQuery }; 
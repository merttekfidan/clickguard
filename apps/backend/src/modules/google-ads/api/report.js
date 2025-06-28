const { getCustomer } = require('./customer');

async function runQuery({ customerId, refreshToken, loginCustomerId, query }) {
  // If SKIP_GOOGLE_ADS_API is true, don't even try to run the query.
  if (process.env.SKIP_GOOGLE_ADS_API === 'true') {
    console.log("🟡 Skipping Google Ads API query due to SKIP_GOOGLE_ADS_API flag.");
    return []; // Return an empty array to simulate no results.
  }

  try {
    const customer = getCustomer({ customerId, refreshToken, loginCustomerId });
    return await customer.query(query);
  } catch (error) {
    console.error('Error running Google Ads query:', error);
    
    // Handle specific gRPC errors
    if (error.code === 12) {
      console.log('⚠️  Google Ads API gRPC error - API not properly configured');
      throw new Error('Google Ads API not properly configured. Please check credentials and developer token.');
    }
    
    if (error.message.includes('invalid_grant')) {
      throw new Error(
        'The refresh token is invalid or expired. Please re-authenticate.'
      );
    }
    
    if (error.message.includes('GRPC target method can\'t be resolved')) {
      console.log('⚠️  Google Ads API gRPC method not found - API version or configuration issue');
      throw new Error('Google Ads API configuration issue. Please check API version and credentials.');
    }
    
    throw new Error(`Failed to run Google Ads query: ${error.message}`);
  }
}

module.exports = { runQuery }; 
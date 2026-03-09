/**
 * Authentication module for Outlook MCP server
 */
const TokenStorage = require('./token-storage');
const { authTools } = require('./tools');
const config = require('../config');

// Singleton TokenStorage instance with credentials from main config
const tokenStorage = new TokenStorage({
  clientId: config.AUTH_CONFIG.clientId,
  clientSecret: config.AUTH_CONFIG.clientSecret,
  tokenStorePath: config.AUTH_CONFIG.tokenStorePath,
  redirectUri: config.AUTH_CONFIG.redirectUri,
  scopes: ['offline_access', ...config.AUTH_CONFIG.scopes],
});

/**
 * Ensures the user is authenticated and returns a valid access token.
 * Automatically refreshes the token using the refresh_token if expired.
 * @param {boolean} forceNew - Whether to force re-authentication
 * @returns {Promise<string>} - Valid access token
 * @throws {Error} - If authentication fails and refresh is not possible
 */
async function ensureAuthenticated(forceNew = false) {
  if (forceNew) {
    throw new Error('Authentication required');
  }
  
  const accessToken = await tokenStorage.getValidAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required. Use the authenticate tool to log in.');
  }
  
  return accessToken;
}

module.exports = {
  tokenStorage,
  authTools,
  ensureAuthenticated
};

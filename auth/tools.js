/**
 * Authentication-related tools for the Outlook MCP server
 */
const config = require('../config');
const TokenStorage = require('./token-storage');

// Shared singleton with credentials from main config
const tokenStorage = new TokenStorage({
  clientId: config.AUTH_CONFIG.clientId,
  clientSecret: config.AUTH_CONFIG.clientSecret,
  tokenStorePath: config.AUTH_CONFIG.tokenStorePath,
  redirectUri: config.AUTH_CONFIG.redirectUri,
  scopes: ['offline_access', ...config.AUTH_CONFIG.scopes],
});

/**
 * About tool handler
 * @returns {object} - MCP response
 */
async function handleAbout() {
  return {
    content: [{
      type: "text",
      text: `📧 MODULAR Outlook Assistant MCP Server v${config.SERVER_VERSION} 📧\n\nProvides access to Microsoft Outlook email, calendar, and contacts through Microsoft Graph API.\nImplemented with a modular architecture for improved maintainability.`
    }]
  };
}

/**
 * Authentication tool handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleAuthenticate(args) {
  const force = args && args.force === true;
  
  // For test mode, create a test token
  if (config.USE_TEST_MODE) {
    // Create a test token with a 1-hour expiry
    const testTokens = {
      access_token: "test_access_token_" + Date.now(),
      refresh_token: "test_refresh_token_" + Date.now(),
      expires_at: Date.now() + (3600 * 1000)
    };
    await tokenStorage._saveTokensToFile?.() || require('./token-manager').createTestTokens();
    
    return {
      content: [{
        type: "text",
        text: 'Successfully authenticated with Microsoft Graph API (test mode)'
      }]
    };
  }
  
  // For real authentication, generate an auth URL and instruct the user to visit it
  const authUrl = `${config.AUTH_CONFIG.authServerUrl}/auth?client_id=${config.AUTH_CONFIG.clientId}`;
  
  return {
    content: [{
      type: "text",
      text: `Authentication required. Please visit the following URL to authenticate with Microsoft: ${authUrl}\n\nAfter authentication, you will be redirected back to this application.`
    }]
  };
}

/**
 * Check authentication status tool handler
 * @returns {object} - MCP response
 */
async function handleCheckAuthStatus() {
  console.error('[CHECK-AUTH-STATUS] Starting authentication status check');
  
  // Use getValidAccessToken() which checks expiry AND attempts refresh,
  // rather than getTokens() which only loads from file without validation.
  try {
    const accessToken = await tokenStorage.getValidAccessToken();
    
    if (!accessToken) {
      console.error('[CHECK-AUTH-STATUS] No valid access token available (expired or missing)');
      const tokens = await tokenStorage.getTokens();
      const hasRefresh = tokens && tokens.refresh_token;
      return {
        content: [{ type: "text", text: hasRefresh
          ? "Not authenticated — token expired, refresh failed. Re-authenticate to restore access."
          : "Not authenticated — no refresh token. Interactive re-authentication required." }]
      };
    }
    
    const expiresAt = tokenStorage.getExpiryTime();
    const remainingMs = expiresAt - Date.now();
    const remainingMin = Math.round(remainingMs / 60000);
    console.error(`[CHECK-AUTH-STATUS] Valid token, expires in ${remainingMin} min`);
    
    return {
      content: [{ type: "text", text: `Authenticated and ready (token valid for ~${remainingMin} min)` }]
    };
  } catch (error) {
    console.error('[CHECK-AUTH-STATUS] Error checking auth:', error);
    return {
      content: [{ type: "text", text: `Authentication error: ${error.message}` }]
    };
  }
}

// Tool definitions
const authTools = [
  {
    name: "about",
    description: "Returns information about this Outlook Assistant server",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
    handler: handleAbout
  },
  {
    name: "authenticate",
    description: "Authenticate with Microsoft Graph API to access Outlook data",
    inputSchema: {
      type: "object",
      properties: {
        force: {
          type: "boolean",
          description: "Force re-authentication even if already authenticated"
        }
      },
      required: []
    },
    handler: handleAuthenticate
  },
  {
    name: "check-auth-status",
    description: "Check the current authentication status with Microsoft Graph API",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
    handler: handleCheckAuthStatus
  }
];

module.exports = {
  authTools,
  handleAbout,
  handleAuthenticate,
  handleCheckAuthStatus
};

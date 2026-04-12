const http = require('http');
const crypto = require('crypto');
const querystring = require('querystring');
const { URL } = require('url');
const config = require('../config');
const TokenStorage = require('./token-storage');

const STATE_TTL_MS = 10 * 60 * 1000;

let authServer = null;
let authServerStartPromise = null;
let tokenStorage = null;
const pendingStates = new Map();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderHtmlPage(title, bodyClass, bodyHtml) {
  return `
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; }
          h1 { margin-bottom: 16px; }
          .info-box, .success-box, .error-box { padding: 16px; border-radius: 6px; border: 1px solid; }
          .info-box { background-color: #e7f6fd; border-color: #b3e0ff; }
          .success-box { background-color: #d4edda; border-color: #c3e6cb; }
          .error-box { background-color: #f8d7da; border-color: #f5c6cb; }
          code { background: #f4f4f4; padding: 2px 4px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div class="${bodyClass}">${bodyHtml}</div>
      </body>
    </html>
  `;
}

function getTokenStorage() {
  if (!tokenStorage) {
    tokenStorage = new TokenStorage({
      tokenStorePath: config.AUTH_CONFIG.tokenStorePath,
      clientId: config.AUTH_CONFIG.clientId,
      clientSecret: config.AUTH_CONFIG.clientSecret,
      redirectUri: config.AUTH_CONFIG.redirectUri,
      scopes: config.AUTH_CONFIG.scopes,
      tokenEndpoint: config.AUTH_CONFIG.tokenEndpoint
    });
  }

  return tokenStorage;
}

function cleanupExpiredStates() {
  const cutoff = Date.now() - STATE_TTL_MS;

  for (const [state, createdAt] of pendingStates.entries()) {
    if (createdAt < cutoff) {
      pendingStates.delete(state);
    }
  }
}

function buildMicrosoftAuthUrl(state) {
  return `${config.AUTH_CONFIG.authEndpoint}?${querystring.stringify({
    client_id: config.AUTH_CONFIG.clientId,
    response_type: 'code',
    redirect_uri: config.AUTH_CONFIG.redirectUri,
    scope: config.AUTH_CONFIG.scopes.join(' '),
    response_mode: 'query',
    state
  })}`;
}

function getAuthEntryUrl() {
  return `${config.AUTH_CONFIG.authServerUrl}/auth`;
}

async function handleRequest(req, res) {
  const requestUrl = new URL(req.url, config.AUTH_CONFIG.authServerUrl);
  const pathname = requestUrl.pathname;

  if (pathname === '/auth') {
    if (!config.AUTH_CONFIG.clientId || !config.AUTH_CONFIG.clientSecret) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(renderHtmlPage(
        'Configuration Error',
        'error-box',
        '<p>Microsoft Graph API credentials are not set. Configure <code>M365_CLIENT_ID</code> and <code>M365_CLIENT_SECRET</code>.</p>'
      ));
      return;
    }

    cleanupExpiredStates();
    const state = crypto.randomBytes(16).toString('hex');
    pendingStates.set(state, Date.now());

    res.writeHead(302, { Location: buildMicrosoftAuthUrl(state) });
    res.end();
    return;
  }

  if (pathname === '/auth/callback') {
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(renderHtmlPage(
        'Authentication Error',
        'error-box',
        `<p><strong>Error:</strong> ${escapeHtml(error)}</p><p><strong>Description:</strong> ${escapeHtml(errorDescription || 'No description provided')}</p><p>Close this window and try again.</p>`
      ));
      return;
    }

    cleanupExpiredStates();
    if (!state || !pendingStates.has(state)) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(renderHtmlPage(
        'Invalid State Parameter',
        'error-box',
        '<p>The OAuth state parameter was missing or invalid. Close this window and start authentication again.</p>'
      ));
      return;
    }

    pendingStates.delete(state);

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(renderHtmlPage(
        'Missing Authorization Code',
        'error-box',
        '<p>No authorization code was provided in the callback.</p><p>Close this window and try again.</p>'
      ));
      return;
    }

    try {
      await getTokenStorage().exchangeCodeForTokens(code);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(renderHtmlPage(
        'Authentication Successful',
        'success-box',
        '<p>You have successfully authenticated with Microsoft Graph API.</p><p>You can close this window and return to your MCP client.</p>'
      ));
    } catch (exchangeError) {
      console.error('Token exchange error:', exchangeError);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(renderHtmlPage(
        'Token Exchange Error',
        'error-box',
        `<p>${escapeHtml(exchangeError.message)}</p><p>Close this window and try again.</p>`
      ));
    }
    return;
  }

  if (pathname === '/token-status') {
    try {
      const accessToken = await getTokenStorage().getValidAccessToken();
      const status = accessToken
        ? `Access token is valid. Expires at: ${new Date(getTokenStorage().getExpiryTime()).toLocaleString()}`
        : 'No valid access token found. Please authenticate.';

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(renderHtmlPage('Token Status', 'info-box', `<p>${escapeHtml(status)}</p>`));
    } catch (statusError) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(renderHtmlPage('Token Status', 'error-box', `<p>${escapeHtml(statusError.message)}</p>`));
    }
    return;
  }

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderHtmlPage(
      'M365 Authentication Server',
      'info-box',
      `<p>This callback server is running inside the MCP process.</p><p>Start authentication from the <code>authenticate</code> tool, not by browsing here directly.</p><p>Callback URL: <code>${escapeHtml(config.AUTH_CONFIG.redirectUri)}</code></p>`
    ));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

function startAuthCallbackServer() {
  if (authServer) {
    return Promise.resolve(authServer);
  }

  if (authServerStartPromise) {
    return authServerStartPromise;
  }

  const authUrl = new URL(config.AUTH_CONFIG.authServerUrl);
  const hostname = authUrl.hostname;
  const port = Number(authUrl.port || (authUrl.protocol === 'https:' ? 443 : 80));

  authServerStartPromise = new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      Promise.resolve(handleRequest(req, res)).catch((error) => {
        console.error('Auth callback server request error:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(renderHtmlPage('Server Error', 'error-box', '<p>Unexpected authentication server error.</p>'));
        }
      });
    });

    server.on('error', (error) => {
      authServerStartPromise = null;
      reject(error);
    });

    server.listen(port, hostname, () => {
      authServer = server;
      authServerStartPromise = null;
      console.error(`Auth callback server listening on ${config.AUTH_CONFIG.authServerUrl}`);
      resolve(server);
    });
  });

  return authServerStartPromise;
}

function stopAuthCallbackServer() {
  pendingStates.clear();

  if (!authServer) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const server = authServer;
    authServer = null;
    authServerStartPromise = null;

    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

module.exports = {
  getAuthEntryUrl,
  startAuthCallbackServer,
  stopAuthCallbackServer
};
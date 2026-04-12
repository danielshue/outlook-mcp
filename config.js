/**
 * Configuration for Outlook MCP Server
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');

// Load local environment files from the repository root.
for (const envFile of [path.join(__dirname, '.env.local'), path.join(__dirname, '.env')]) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
  }
}

// Ensure we have a home directory path even if process.env.HOME is undefined
const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir() || '/tmp';
const redirectUri = process.env.M365_REDIRECT_URI || 'http://localhost:3333/auth/callback';
const authServerUrl = new URL(redirectUri).origin;
const authScopes = (process.env.M365_SCOPES || 'offline_access User.Read Mail.Read Mail.ReadWrite Mail.Send Calendars.Read Calendars.ReadWrite Files.Read Files.ReadWrite').split(' ');

module.exports = {
  // Server information
  SERVER_NAME: "m365-assistant",
  SERVER_VERSION: "2.0.0",
  
  // Test mode setting
  USE_TEST_MODE: process.env.USE_TEST_MODE === 'true',
  
  // Authentication configuration
  AUTH_CONFIG: {
    clientId: process.env.M365_CLIENT_ID || '',
    clientSecret: process.env.M365_CLIENT_SECRET || '',
    redirectUri,
    scopes: authScopes,
    tokenStorePath: path.join(homeDir, '.outlook-mcp-tokens.json'),
    authServerUrl,
    authEndpoint: process.env.M365_AUTH_ENDPOINT || 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: process.env.M365_TOKEN_ENDPOINT || 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
  },
  
  // Microsoft Graph API
  GRAPH_API_ENDPOINT: 'https://graph.microsoft.com/v1.0/',
  
  // Calendar constants
  CALENDAR_SELECT_FIELDS: 'id,subject,start,end,location,bodyPreview,isAllDay,recurrence,attendees',

  // Email constants
  EMAIL_SELECT_FIELDS: 'id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,hasAttachments,importance,isRead',
  EMAIL_DETAIL_FIELDS: 'id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,bodyPreview,body,hasAttachments,importance,isRead,internetMessageHeaders',
  
  // Calendar constants
  CALENDAR_SELECT_FIELDS: 'id,subject,bodyPreview,start,end,location,organizer,attendees,isAllDay,isCancelled',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 25,
  MAX_RESULT_COUNT: 50,

  // Timezone
  DEFAULT_TIMEZONE: "Central European Standard Time",

  // OneDrive constants
  ONEDRIVE_SELECT_FIELDS: 'id,name,size,lastModifiedDateTime,webUrl,folder,file,parentReference',
  ONEDRIVE_UPLOAD_THRESHOLD: 4 * 1024 * 1024, // 4MB - files larger than this need chunked upload

  // Power Automate / Flow constants
  FLOW_API_ENDPOINT: 'https://api.flow.microsoft.com',
  FLOW_SCOPE: 'https://service.flow.microsoft.com/.default',
};

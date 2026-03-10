/**
 * Delete contact functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Delete contact handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleDeleteContact(args) {
  const contactId = args.id;

  if (!contactId) {
    return {
      content: [{
        type: "text",
        text: "Contact ID is required. Use 'list-contacts' or 'search-contacts' to find contact IDs."
      }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();

    const endpoint = `me/contacts/${encodeURIComponent(contactId)}`;
    await callGraphAPI(accessToken, 'DELETE', endpoint);

    return {
      content: [{
        type: "text",
        text: `Contact deleted successfully (ID: ${contactId}).`
      }]
    };
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{
          type: "text",
          text: "Authentication required. Please use the 'authenticate' tool first."
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: `Error deleting contact: ${error.message}`
      }]
    };
  }
}

module.exports = handleDeleteContact;

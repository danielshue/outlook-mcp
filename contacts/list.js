/**
 * List contacts functionality
 */
const config = require('../config');
const { callGraphAPIPaginated } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * List contacts handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleListContacts(args) {
  const requestedCount = args.count || 10;

  try {
    const accessToken = await ensureAuthenticated();

    const endpoint = 'me/contacts';
    const queryParams = {
      $top: Math.min(50, requestedCount),
      $orderby: 'displayName asc',
      $select: config.CONTACT_SELECT_FIELDS
    };

    const response = await callGraphAPIPaginated(accessToken, 'GET', endpoint, queryParams, requestedCount);

    if (!response.value || response.value.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No contacts found."
        }]
      };
    }

    const contactList = response.value.map((contact, index) => {
      const emails = (contact.emailAddresses || []).map(e => e.address).join(', ') || 'No email';
      const phone = contact.mobilePhone || (contact.businessPhones && contact.businessPhones[0]) || 'No phone';
      const company = contact.companyName ? ` (${contact.companyName})` : '';
      const title = contact.jobTitle ? ` - ${contact.jobTitle}` : '';

      return `${index + 1}. ${contact.displayName || 'Unnamed'}${company}${title}\n   Email: ${emails}\n   Phone: ${phone}\n   ID: ${contact.id}`;
    }).join("\n\n");

    return {
      content: [{
        type: "text",
        text: `Found ${response.value.length} contacts:\n\n${contactList}`
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
        text: `Error listing contacts: ${error.message}`
      }]
    };
  }
}

module.exports = handleListContacts;

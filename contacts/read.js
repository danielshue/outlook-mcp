/**
 * Read contact details functionality
 */
const config = require('../config');
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Read contact handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleReadContact(args) {
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
    const queryParams = {
      $select: config.CONTACT_DETAIL_FIELDS
    };

    const contact = await callGraphAPI(accessToken, 'GET', endpoint, null, queryParams);

    const details = formatContactDetails(contact);

    return {
      content: [{
        type: "text",
        text: details
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
        text: `Error reading contact: ${error.message}`
      }]
    };
  }
}

/**
 * Format a contact object into a readable string
 * @param {object} contact - Graph API contact object
 * @returns {string} - Formatted contact details
 */
function formatContactDetails(contact) {
  const lines = [];

  lines.push(`**${contact.displayName || 'Unnamed Contact'}**`);
  lines.push(`ID: ${contact.id}`);
  lines.push('');

  // Name details
  const nameParts = [contact.givenName, contact.middleName, contact.surname].filter(Boolean);
  if (nameParts.length > 0) {
    lines.push(`Name: ${nameParts.join(' ')}`);
  }

  // Work info
  if (contact.jobTitle) lines.push(`Job Title: ${contact.jobTitle}`);
  if (contact.department) lines.push(`Department: ${contact.department}`);
  if (contact.companyName) lines.push(`Company: ${contact.companyName}`);

  // Email addresses
  if (contact.emailAddresses && contact.emailAddresses.length > 0) {
    lines.push('');
    lines.push('Email Addresses:');
    contact.emailAddresses.forEach(e => {
      const label = e.name ? ` (${e.name})` : '';
      lines.push(`  - ${e.address}${label}`);
    });
  }

  // Phone numbers
  const phones = [];
  if (contact.mobilePhone) phones.push(`  Mobile: ${contact.mobilePhone}`);
  if (contact.businessPhones && contact.businessPhones.length > 0) {
    contact.businessPhones.forEach(p => phones.push(`  Business: ${p}`));
  }
  if (contact.homePhones && contact.homePhones.length > 0) {
    contact.homePhones.forEach(p => phones.push(`  Home: ${p}`));
  }
  if (phones.length > 0) {
    lines.push('');
    lines.push('Phone Numbers:');
    phones.forEach(p => lines.push(p));
  }

  // Addresses
  const addresses = [
    { label: 'Business', addr: contact.businessAddress },
    { label: 'Home', addr: contact.homeAddress },
    { label: 'Other', addr: contact.otherAddress }
  ];
  const validAddresses = addresses.filter(a => a.addr && Object.values(a.addr).some(v => v));
  if (validAddresses.length > 0) {
    lines.push('');
    lines.push('Addresses:');
    validAddresses.forEach(({ label, addr }) => {
      const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.countryOrRegion].filter(Boolean);
      lines.push(`  ${label}: ${parts.join(', ')}`);
    });
  }

  // Other info
  if (contact.birthday) {
    lines.push('');
    lines.push(`Birthday: ${new Date(contact.birthday).toLocaleDateString()}`);
  }

  if (contact.categories && contact.categories.length > 0) {
    lines.push(`Categories: ${contact.categories.join(', ')}`);
  }

  if (contact.personalNotes) {
    lines.push('');
    lines.push(`Notes: ${contact.personalNotes}`);
  }

  return lines.join('\n');
}

module.exports = handleReadContact;

/**
 * Create contact functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Create contact handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleCreateContact(args) {
  const { givenName, surname, emailAddresses, mobilePhone, businessPhones,
    homePhones, companyName, jobTitle, department, businessAddress,
    homeAddress, otherAddress, birthday, personalNotes, categories } = args;

  if (!givenName && !surname && (!emailAddresses || emailAddresses.length === 0)) {
    return {
      content: [{
        type: "text",
        text: "At least one of givenName, surname, or emailAddresses is required to create a contact."
      }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();

    const body = {};

    if (givenName) body.givenName = givenName;
    if (surname) body.surname = surname;
    if (emailAddresses) {
      body.emailAddresses = emailAddresses.map(e =>
        typeof e === 'string' ? { address: e, name: e } : e
      );
    }
    if (mobilePhone) body.mobilePhone = mobilePhone;
    if (businessPhones) body.businessPhones = businessPhones;
    if (homePhones) body.homePhones = homePhones;
    if (companyName) body.companyName = companyName;
    if (jobTitle) body.jobTitle = jobTitle;
    if (department) body.department = department;
    if (businessAddress) body.businessAddress = businessAddress;
    if (homeAddress) body.homeAddress = homeAddress;
    if (otherAddress) body.otherAddress = otherAddress;
    if (birthday) body.birthday = birthday;
    if (personalNotes) body.personalNotes = personalNotes;
    if (categories) body.categories = categories;

    const response = await callGraphAPI(accessToken, 'POST', 'me/contacts', body);

    const displayName = response.displayName || [givenName, surname].filter(Boolean).join(' ') || 'New contact';

    return {
      content: [{
        type: "text",
        text: `Contact '${displayName}' created successfully.\nID: ${response.id}`
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
        text: `Error creating contact: ${error.message}`
      }]
    };
  }
}

module.exports = handleCreateContact;

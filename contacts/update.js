/**
 * Update contact functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Update contact handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleUpdateContact(args) {
  const { id, givenName, surname, emailAddresses, mobilePhone, businessPhones,
    homePhones, companyName, jobTitle, department, businessAddress,
    homeAddress, otherAddress, birthday, personalNotes, categories } = args;

  if (!id) {
    return {
      content: [{
        type: "text",
        text: "Contact ID is required. Use 'list-contacts' or 'search-contacts' to find contact IDs."
      }]
    };
  }

  // Build update body from provided fields
  const body = {};
  if (givenName !== undefined) body.givenName = givenName;
  if (surname !== undefined) body.surname = surname;
  if (emailAddresses !== undefined) {
    body.emailAddresses = emailAddresses.map(e =>
      typeof e === 'string' ? { address: e, name: e } : e
    );
  }
  if (mobilePhone !== undefined) body.mobilePhone = mobilePhone;
  if (businessPhones !== undefined) body.businessPhones = businessPhones;
  if (homePhones !== undefined) body.homePhones = homePhones;
  if (companyName !== undefined) body.companyName = companyName;
  if (jobTitle !== undefined) body.jobTitle = jobTitle;
  if (department !== undefined) body.department = department;
  if (businessAddress !== undefined) body.businessAddress = businessAddress;
  if (homeAddress !== undefined) body.homeAddress = homeAddress;
  if (otherAddress !== undefined) body.otherAddress = otherAddress;
  if (birthday !== undefined) body.birthday = birthday;
  if (personalNotes !== undefined) body.personalNotes = personalNotes;
  if (categories !== undefined) body.categories = categories;

  if (Object.keys(body).length === 0) {
    return {
      content: [{
        type: "text",
        text: "At least one field to update is required."
      }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();

    const endpoint = `me/contacts/${encodeURIComponent(id)}`;
    const response = await callGraphAPI(accessToken, 'PATCH', endpoint, body);

    const displayName = response.displayName || 'Contact';

    return {
      content: [{
        type: "text",
        text: `Contact '${displayName}' updated successfully.`
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
        text: `Error updating contact: ${error.message}`
      }]
    };
  }
}

module.exports = handleUpdateContact;

/**
 * Search contacts functionality
 */
const config = require('../config');
const { callGraphAPI, callGraphAPIPaginated } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Search contacts handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleSearchContacts(args) {
  const query = args.query || '';
  const name = args.name || '';
  const email = args.email || '';
  const company = args.company || '';
  const requestedCount = args.count || 10;

  if (!query && !name && !email && !company) {
    return {
      content: [{
        type: "text",
        text: "Please provide at least one search criterion: query, name, email, or company."
      }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();

    // Strategy 1: Try OData $filter
    const filterResult = await tryFilterSearch(accessToken, { name, email, company, query }, requestedCount);
    if (filterResult && filterResult.value && filterResult.value.length > 0) {
      return formatResults(filterResult);
    }

    // Strategy 2: Fall back to $search on the general query (or first available term)
    const searchTerm = query || name || email || company;
    const searchResult = await tryTextSearch(accessToken, searchTerm, requestedCount);
    if (searchResult && searchResult.value && searchResult.value.length > 0) {
      return formatResults(searchResult);
    }

    // Strategy 3: Fetch all and filter client-side
    const clientResult = await tryClientSideSearch(accessToken, { name, email, company, query }, requestedCount);
    if (clientResult && clientResult.value && clientResult.value.length > 0) {
      return formatResults(clientResult);
    }

    return {
      content: [{
        type: "text",
        text: "No contacts found matching your search criteria."
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
        text: `Error searching contacts: ${error.message}`
      }]
    };
  }
}

/**
 * Try OData $filter based search
 */
async function tryFilterSearch(accessToken, terms, maxCount) {
  const filters = [];

  if (terms.name) {
    filters.push(`contains(displayName,'${terms.name.replace(/'/g, "''")}')`);
  }
  if (terms.company) {
    filters.push(`contains(companyName,'${terms.company.replace(/'/g, "''")}')`);
  }
  // emailAddresses is a collection, so $filter contains() won't work directly on it
  // We'll handle email matching in client-side fallback

  if (filters.length === 0 && terms.query) {
    filters.push(`contains(displayName,'${terms.query.replace(/'/g, "''")}')`);
  }

  if (filters.length === 0) {
    return null;
  }

  try {
    const queryParams = {
      $filter: filters.join(' and '),
      $top: Math.min(50, maxCount),
      $select: config.CONTACT_SELECT_FIELDS,
      $orderby: 'displayName asc'
    };

    return await callGraphAPIPaginated(accessToken, 'GET', 'me/contacts', queryParams, maxCount);
  } catch (error) {
    console.error(`Filter search failed: ${error.message}`);
    return null;
  }
}

/**
 * Try $search text search
 */
async function tryTextSearch(accessToken, searchTerm, maxCount) {
  try {
    const queryParams = {
      $search: `"${searchTerm}"`,
      $top: Math.min(50, maxCount),
      $select: config.CONTACT_SELECT_FIELDS
    };

    return await callGraphAPI(accessToken, 'GET', 'me/contacts', null, queryParams);
  } catch (error) {
    console.error(`Text search failed: ${error.message}`);
    return null;
  }
}

/**
 * Fetch contacts and filter client-side
 */
async function tryClientSideSearch(accessToken, terms, maxCount) {
  try {
    const queryParams = {
      $top: 100,
      $select: config.CONTACT_SELECT_FIELDS,
      $orderby: 'displayName asc'
    };

    const all = await callGraphAPIPaginated(accessToken, 'GET', 'me/contacts', queryParams, 200);
    if (!all.value) return null;

    const searchLower = (terms.query || '').toLowerCase();
    const nameLower = (terms.name || '').toLowerCase();
    const emailLower = (terms.email || '').toLowerCase();
    const companyLower = (terms.company || '').toLowerCase();

    const filtered = all.value.filter(contact => {
      const displayName = (contact.displayName || '').toLowerCase();
      const contactCompany = (contact.companyName || '').toLowerCase();
      const emails = (contact.emailAddresses || []).map(e => (e.address || '').toLowerCase());

      if (nameLower && !displayName.includes(nameLower)) return false;
      if (companyLower && !contactCompany.includes(companyLower)) return false;
      if (emailLower && !emails.some(e => e.includes(emailLower))) return false;
      if (searchLower) {
        const matchesAny = displayName.includes(searchLower)
          || contactCompany.includes(searchLower)
          || emails.some(e => e.includes(searchLower));
        if (!matchesAny) return false;
      }

      return true;
    });

    return { value: filtered.slice(0, maxCount) };
  } catch (error) {
    console.error(`Client-side search failed: ${error.message}`);
    return null;
  }
}

/**
 * Format search results into MCP response
 */
function formatResults(response) {
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
}

module.exports = handleSearchContacts;

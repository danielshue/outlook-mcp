/**
 * Contacts module for Outlook MCP server
 */
const handleListContacts = require('./list');
const handleSearchContacts = require('./search');
const handleReadContact = require('./read');
const handleCreateContact = require('./create');
const handleUpdateContact = require('./update');
const handleDeleteContact = require('./delete');

// Contact tool definitions
const contactsTools = [
  {
    name: "list-contacts",
    description: "Lists contacts from your Outlook address book",
    inputSchema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of contacts to retrieve (default: 10, max: 50)"
        }
      },
      required: []
    },
    handler: handleListContacts
  },
  {
    name: "search-contacts",
    description: "Search for contacts by name, email address, or company",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "General search text to match across name, email, and company"
        },
        name: {
          type: "string",
          description: "Filter by contact display name"
        },
        email: {
          type: "string",
          description: "Filter by email address"
        },
        company: {
          type: "string",
          description: "Filter by company name"
        },
        count: {
          type: "number",
          description: "Maximum number of results (default: 10)"
        }
      },
      required: []
    },
    handler: handleSearchContacts
  },
  {
    name: "read-contact",
    description: "Read full details of a specific contact by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The contact ID (use list-contacts or search-contacts to find IDs)"
        }
      },
      required: ["id"]
    },
    handler: handleReadContact
  },
  {
    name: "create-contact",
    description: "Create a new contact in your Outlook address book",
    inputSchema: {
      type: "object",
      properties: {
        givenName: {
          type: "string",
          description: "First name"
        },
        surname: {
          type: "string",
          description: "Last name"
        },
        emailAddresses: {
          type: "array",
          items: { type: "string" },
          description: "Email addresses (array of strings)"
        },
        mobilePhone: {
          type: "string",
          description: "Mobile phone number"
        },
        businessPhones: {
          type: "array",
          items: { type: "string" },
          description: "Business phone numbers"
        },
        homePhones: {
          type: "array",
          items: { type: "string" },
          description: "Home phone numbers"
        },
        companyName: {
          type: "string",
          description: "Company or organization name"
        },
        jobTitle: {
          type: "string",
          description: "Job title"
        },
        department: {
          type: "string",
          description: "Department"
        },
        businessAddress: {
          type: "object",
          properties: {
            street: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postalCode: { type: "string" },
            countryOrRegion: { type: "string" }
          },
          description: "Business address"
        },
        homeAddress: {
          type: "object",
          properties: {
            street: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postalCode: { type: "string" },
            countryOrRegion: { type: "string" }
          },
          description: "Home address"
        },
        birthday: {
          type: "string",
          description: "Birthday in ISO 8601 format (e.g., 1990-01-15)"
        },
        personalNotes: {
          type: "string",
          description: "Personal notes about the contact"
        },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Categories/tags for the contact"
        }
      },
      required: []
    },
    handler: handleCreateContact
  },
  {
    name: "update-contact",
    description: "Update an existing contact's information",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The contact ID to update"
        },
        givenName: {
          type: "string",
          description: "First name"
        },
        surname: {
          type: "string",
          description: "Last name"
        },
        emailAddresses: {
          type: "array",
          items: { type: "string" },
          description: "Email addresses (replaces existing)"
        },
        mobilePhone: {
          type: "string",
          description: "Mobile phone number"
        },
        businessPhones: {
          type: "array",
          items: { type: "string" },
          description: "Business phone numbers"
        },
        homePhones: {
          type: "array",
          items: { type: "string" },
          description: "Home phone numbers"
        },
        companyName: {
          type: "string",
          description: "Company or organization name"
        },
        jobTitle: {
          type: "string",
          description: "Job title"
        },
        department: {
          type: "string",
          description: "Department"
        },
        businessAddress: {
          type: "object",
          properties: {
            street: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postalCode: { type: "string" },
            countryOrRegion: { type: "string" }
          },
          description: "Business address"
        },
        homeAddress: {
          type: "object",
          properties: {
            street: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postalCode: { type: "string" },
            countryOrRegion: { type: "string" }
          },
          description: "Home address"
        },
        birthday: {
          type: "string",
          description: "Birthday in ISO 8601 format (e.g., 1990-01-15)"
        },
        personalNotes: {
          type: "string",
          description: "Personal notes about the contact"
        },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Categories/tags for the contact"
        }
      },
      required: ["id"]
    },
    handler: handleUpdateContact
  },
  {
    name: "delete-contact",
    description: "Delete a contact from your Outlook address book",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The contact ID to delete"
        }
      },
      required: ["id"]
    },
    handler: handleDeleteContact
  }
];

module.exports = {
  contactsTools,
  handleListContacts,
  handleSearchContacts,
  handleReadContact,
  handleCreateContact,
  handleUpdateContact,
  handleDeleteContact
};

'use strict';

/** "Create or Update Contact" — upserts by phone via POST /api/v1/contacts. */
const perform = async (z, bundle) => {
  const res = await z.request({
    url: `${bundle.authData.site_url}/api/v1/contacts`,
    method: 'POST',
    body: {
      phone: bundle.inputData.phone,
      name: bundle.inputData.name,
      email: bundle.inputData.email,
      company: bundle.inputData.company,
      source: bundle.inputData.source,
    },
  });
  return res.data.data;
};

module.exports = {
  key: 'create_contact',
  noun: 'Contact',
  display: {
    label: 'Create or Update Contact',
    description: 'Adds a contact to WaCRM, or updates it if the phone already exists.',
  },
  operation: {
    perform,
    inputFields: [
      { key: 'phone', label: 'Phone', type: 'string', required: true, helpText: 'In international format, e.g. 15551234567.' },
      { key: 'name', label: 'Name', type: 'string' },
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'company', label: 'Company', type: 'string' },
      { key: 'source', label: 'Source', type: 'string', helpText: 'Where this contact came from, e.g. "shopify".' },
    ],
    sample: { id: 'abc-123', name: 'Jane Doe', phone: '15551234567', email: 'jane@example.com' },
    outputFields: [
      { key: 'id', label: 'Contact ID' },
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
    ],
  },
};

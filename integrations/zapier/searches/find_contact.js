'use strict';

/** "Find Contact" — GET /api/v1/contacts?phone=… (exact match by phone). */
const perform = async (z, bundle) => {
  const res = await z.request({
    url: `${bundle.authData.site_url}/api/v1/contacts`,
    params: { phone: bundle.inputData.phone },
  });
  return res.data.data || [];
};

module.exports = {
  key: 'find_contact',
  noun: 'Contact',
  display: {
    label: 'Find Contact',
    description: 'Finds a contact by phone number.',
  },
  operation: {
    perform,
    inputFields: [
      { key: 'phone', label: 'Phone', type: 'string', required: true },
    ],
    sample: { id: 'abc-123', name: 'Jane Doe', phone: '15551234567' },
    outputFields: [
      { key: 'id', label: 'Contact ID' },
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
    ],
  },
};

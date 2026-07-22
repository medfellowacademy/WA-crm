'use strict';

/** "Add Tag to Contact" — POST /api/v1/contacts/:id/tags (tag auto-created). */
const perform = async (z, bundle) => {
  const res = await z.request({
    url: `${bundle.authData.site_url}/api/v1/contacts/${bundle.inputData.contact_id}/tags`,
    method: 'POST',
    body: { tag: bundle.inputData.tag },
  });
  return res.data;
};

module.exports = {
  key: 'add_tag',
  noun: 'Tag',
  display: {
    label: 'Add Tag to Contact',
    description: 'Adds a tag to a contact, creating the tag if it does not exist.',
  },
  operation: {
    perform,
    inputFields: [
      {
        key: 'contact_id',
        label: 'Contact ID',
        type: 'string',
        required: true,
        helpText: 'Use the Find Contact search or a trigger output to get this.',
      },
      { key: 'tag', label: 'Tag', type: 'string', required: true },
    ],
    sample: { ok: true, contact_id: 'abc-123', tag: 'VIP' },
    outputFields: [
      { key: 'contact_id', label: 'Contact ID' },
      { key: 'tag', label: 'Tag' },
    ],
  },
};

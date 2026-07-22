'use strict';

/**
 * "New Contact" trigger — REST Hook. On enable, Zapier subscribes a
 * target URL via POST /api/v1/webhooks; WaCRM POSTs there when the
 * `new_contact` event fires. performList provides sample data so Zapier
 * can build/test the Zap without waiting for a live event.
 */
const EVENT = 'new_contact';

const subscribeHook = async (z, bundle) => {
  const res = await z.request({
    url: `${bundle.authData.site_url}/api/v1/webhooks`,
    method: 'POST',
    body: { target_url: bundle.targetUrl, event: EVENT },
  });
  return res.data; // { id }
};

const unsubscribeHook = async (z, bundle) => {
  const id = bundle.subscribeData && bundle.subscribeData.id;
  if (!id) return {};
  await z.request({
    url: `${bundle.authData.site_url}/api/v1/webhooks/${id}`,
    method: 'DELETE',
  });
  return {};
};

// The dispatcher sends { event, org_id, timestamp, data: {...} }.
const parsePayload = (z, bundle) => {
  const d = (bundle.cleanedRequest && bundle.cleanedRequest.data) || {};
  return [
    {
      id: d.contact_id,
      contact_id: d.contact_id,
      name: d.contact_name,
      phone: d.contact_phone,
    },
  ];
};

const getFallbackList = async (z, bundle) => {
  const res = await z.request({
    url: `${bundle.authData.site_url}/api/v1/contacts`,
    params: { limit: 3 },
  });
  return (res.data.data || []).map((c) => ({
    id: c.id,
    contact_id: c.id,
    name: c.name,
    phone: c.phone,
  }));
};

module.exports = {
  key: 'new_contact',
  noun: 'Contact',
  display: {
    label: 'New Contact',
    description: 'Triggers when a new contact is created in WaCRM.',
  },
  operation: {
    type: 'hook',
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    perform: parsePayload,
    performList: getFallbackList,
    sample: { id: 'abc-123', contact_id: 'abc-123', name: 'Jane Doe', phone: '15551234567' },
    outputFields: [
      { key: 'contact_id', label: 'Contact ID' },
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
    ],
  },
};

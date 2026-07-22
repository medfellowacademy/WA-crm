'use strict';

/**
 * "New Inbound Message" trigger — REST Hook on the `new_message` event.
 * Fires whenever a customer sends a message into WaCRM.
 */
const EVENT = 'new_message';

const subscribeHook = async (z, bundle) => {
  const res = await z.request({
    url: `${bundle.authData.site_url}/api/v1/webhooks`,
    method: 'POST',
    body: { target_url: bundle.targetUrl, event: EVENT },
  });
  return res.data;
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

const parsePayload = (z, bundle) => {
  const d = (bundle.cleanedRequest && bundle.cleanedRequest.data) || {};
  return [
    {
      id: `${d.conversation_id}-${Date.now()}`,
      contact_id: d.contact_id,
      contact_name: d.contact_name,
      contact_phone: d.contact_phone,
      conversation_id: d.conversation_id,
      message_type: d.message_type,
      message_text: d.message_text,
    },
  ];
};

const getFallbackList = async (z, bundle) => {
  // No public messages list endpoint yet; return a representative sample
  // so Zapier can finish setup. Live runs use the hook payload above.
  return [
    {
      id: 'sample-1',
      contact_id: 'abc-123',
      contact_name: 'Jane Doe',
      contact_phone: '15551234567',
      conversation_id: 'conv-123',
      message_type: 'text',
      message_text: 'Hi, is this still available?',
    },
  ];
};

module.exports = {
  key: 'new_message',
  noun: 'Message',
  display: {
    label: 'New Inbound Message',
    description: 'Triggers when a customer sends a message in WaCRM.',
  },
  operation: {
    type: 'hook',
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    perform: parsePayload,
    performList: getFallbackList,
    sample: {
      id: 'sample-1',
      contact_id: 'abc-123',
      contact_name: 'Jane Doe',
      contact_phone: '15551234567',
      conversation_id: 'conv-123',
      message_type: 'text',
      message_text: 'Hi, is this still available?',
    },
    outputFields: [
      { key: 'contact_id', label: 'Contact ID' },
      { key: 'contact_name', label: 'Contact Name' },
      { key: 'contact_phone', label: 'Contact Phone' },
      { key: 'conversation_id', label: 'Conversation ID' },
      { key: 'message_type', label: 'Message Type' },
      { key: 'message_text', label: 'Message Text' },
    ],
  },
};

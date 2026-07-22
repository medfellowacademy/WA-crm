'use strict';

/** "Send WhatsApp Message" — POST /api/v1/messages. */
const perform = async (z, bundle) => {
  const res = await z.request({
    url: `${bundle.authData.site_url}/api/v1/messages`,
    method: 'POST',
    body: {
      phone: bundle.inputData.phone,
      text: bundle.inputData.text,
    },
  });
  return res.data;
};

module.exports = {
  key: 'send_message',
  noun: 'Message',
  display: {
    label: 'Send WhatsApp Message',
    description:
      'Sends a WhatsApp text message to a phone number. Note: outside the 24-hour customer service window, WhatsApp requires an approved template.',
  },
  operation: {
    perform,
    inputFields: [
      { key: 'phone', label: 'Phone', type: 'string', required: true, helpText: 'International format, e.g. 15551234567.' },
      { key: 'text', label: 'Message', type: 'text', required: true },
    ],
    sample: { ok: true, message_id: 'wamid.XXX', contact_id: 'abc-123', conversation_id: 'conv-123' },
    outputFields: [
      { key: 'message_id', label: 'WhatsApp Message ID' },
      { key: 'contact_id', label: 'Contact ID' },
      { key: 'conversation_id', label: 'Conversation ID' },
    ],
  },
};

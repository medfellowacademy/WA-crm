'use strict';

/**
 * API-key authentication. Because WaCRM is self-hostable / white-label,
 * we ask for the instance URL alongside the key so each user points at
 * their own deployment.
 */
const authentication = {
  type: 'custom',
  fields: [
    {
      key: 'site_url',
      label: 'WaCRM URL',
      type: 'string',
      required: true,
      default: 'https://app.yourdomain.com',
      helpText: 'The base URL of your WaCRM instance (no trailing slash).',
    },
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      helpText: 'Create one in Settings → Integrations → API Keys (starts with `wacrm_live_`).',
    },
  ],
  // Hitting /api/v1/me validates the key and surfaces the org name.
  test: {
    url: '{{bundle.authData.site_url}}/api/v1/me',
    method: 'GET',
  },
  connectionLabel: '{{json.org.name}}',
};

// Attach the bearer token to every outbound request.
const includeApiKey = (request, z, bundle) => {
  if (bundle.authData.api_key) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.api_key}`;
  }
  return request;
};

module.exports = { authentication, includeApiKey };

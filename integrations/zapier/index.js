'use strict';

const { version: platformVersion } = require('zapier-platform-core');
const { version } = require('./package.json');

const { authentication, includeApiKey } = require('./authentication');

const newContact = require('./triggers/new_contact');
const newMessage = require('./triggers/new_message');
const createContact = require('./creates/create_contact');
const addTag = require('./creates/add_tag');
const sendMessage = require('./creates/send_message');
const findContact = require('./searches/find_contact');

const App = {
  version,
  platformVersion,

  authentication,

  // Inject the bearer token on every request.
  beforeRequest: [includeApiKey],
  afterResponse: [],

  triggers: {
    [newContact.key]: newContact,
    [newMessage.key]: newMessage,
  },

  creates: {
    [createContact.key]: createContact,
    [addTag.key]: addTag,
    [sendMessage.key]: sendMessage,
  },

  searches: {
    [findContact.key]: findContact,
  },
};

module.exports = App;

# WaCRM — Zapier Integration

Connects WaCRM (WhatsApp CRM) to 6000+ apps on Zapier. Because Zapier
indirectly bridges Zoho, HubSpot, Slack, Sheets, Pipedrive and more, this
one app covers most "does it integrate with…?" buyer questions.

## What's included

**Triggers** (REST Hooks — instant, no polling)
- **New Contact** — a contact is created in WaCRM
- **New Inbound Message** — a customer messages you

**Actions**
- **Create or Update Contact** — upsert by phone (push customers in from Shopify/HubSpot/Sheets)
- **Add Tag to Contact** — tag for segmentation (auto-creates the tag)
- **Send WhatsApp Message** — send a text to any number

**Searches**
- **Find Contact** — look up by phone (chain into actions)

## How it talks to WaCRM

Everything runs against the public REST API in this repo:

| Zapier piece | Endpoint |
|---|---|
| Auth test | `GET /api/v1/me` |
| Create/Update Contact | `POST /api/v1/contacts` |
| Find Contact | `GET /api/v1/contacts?phone=` |
| Add Tag | `POST /api/v1/contacts/:id/tags` |
| Send Message | `POST /api/v1/messages` |
| Trigger subscribe/unsubscribe | `POST` / `DELETE /api/v1/webhooks` |

Auth is an API key (`Settings → Integrations → API Keys`) sent as
`Authorization: Bearer wacrm_live_…`. The connection also asks for the
instance URL so self-hosted / white-label deployments work.

## Develop & publish

```bash
cd integrations/zapier
npm install
npm install -g zapier-platform-cli
zapier login
zapier register "WaCRM"   # first time only
zapier validate
zapier push               # uploads this app version
# then invite testers / submit for public listing from the Zapier dashboard
```

> Requires the API endpoints to be live on a public URL and migration
> `027_public_api_and_attribution.sql` applied (creates the `api_keys` table).

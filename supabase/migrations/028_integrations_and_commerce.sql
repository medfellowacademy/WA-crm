-- ============================================================
-- Migration 028: Native OAuth integrations + Commerce catalog
--
--   integration_connections — generic encrypted token store for OAuth
--     providers (google_sheets, shopify). One row per (org, provider).
--   products — commerce catalog. Each product can generate a WhatsApp
--     payment link (via Stripe) that's sent to a customer.
-- ============================================================

-- ── OAuth / token store ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS integration_connections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,            -- 'google_sheets' | 'shopify'
  access_token  TEXT,                     -- encrypted
  refresh_token TEXT,                     -- encrypted
  external_id   TEXT,                     -- shop domain, spreadsheet id, etc.
  metadata      JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  connected_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_org ON integration_connections(org_id);

ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members can manage connections" ON integration_connections;
CREATE POLICY "Org members can manage connections" ON integration_connections FOR ALL
  USING (org_id = public.current_org_id());

DROP TRIGGER IF EXISTS set_updated_at ON integration_connections;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON integration_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Commerce catalog ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  price        DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'USD',
  image_url    TEXT,
  sku          TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_org ON products(org_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members can manage products" ON products;
CREATE POLICY "Org members can manage products" ON products FOR ALL
  USING (org_id = public.current_org_id());

DROP TRIGGER IF EXISTS set_updated_at ON products;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

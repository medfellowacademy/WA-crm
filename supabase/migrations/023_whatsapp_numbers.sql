-- Multi-number WhatsApp support per org
CREATE TABLE IF NOT EXISTS whatsapp_numbers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label           TEXT NOT NULL DEFAULT 'Default',
  phone_number_id TEXT NOT NULL,
  waba_id         TEXT,
  access_token    TEXT NOT NULL,
  verify_token    TEXT,
  display_phone   TEXT,
  verified_name   TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  status          TEXT DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, phone_number_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_numbers_org      ON whatsapp_numbers(org_id);
CREATE INDEX IF NOT EXISTS idx_wa_numbers_phone_id ON whatsapp_numbers(phone_number_id);

ALTER TABLE whatsapp_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage whatsapp numbers" ON whatsapp_numbers FOR ALL
  USING (org_id = public.current_org_id());

DROP TRIGGER IF EXISTS set_updated_at ON whatsapp_numbers;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON whatsapp_numbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add whatsapp_number_id FK to conversations so we know which number each came from
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS whatsapp_number_id UUID REFERENCES whatsapp_numbers(id);
CREATE INDEX IF NOT EXISTS idx_conversations_wa_number ON conversations(whatsapp_number_id);

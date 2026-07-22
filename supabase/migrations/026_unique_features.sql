-- Migration 026: Unique differentiator features
-- Sentiment analysis, revenue attribution, white label

-- Sentiment score on conversations (set by AI after each customer message)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative'));

-- Revenue attribution: mark a conversation as "won" with a dollar value
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conversion_note TEXT;

-- White label: org-level custom branding
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS app_name TEXT;

-- ============================================================
-- Migration 033 — Auto-fill org_id on insert
--
-- Migration 015 added `org_id` + RLS policies requiring
-- org_id = current_org_id() to every core table, but several
-- client-side insert call sites (contact-form, import-modal,
-- tag-manager, and others written before the org migration)
-- never set org_id on the row they insert. Every one of those
-- inserts has been silently failing RLS ever since with
-- "new row violates row-level security policy".
--
-- Rather than hunting down and patching every insert call site
-- individually, this trigger fills org_id from the current
-- session's org membership whenever a row is inserted without
-- one. Existing inserts that DO set org_id explicitly are
-- untouched (the trigger only fires when org_id IS NULL).
-- ============================================================

CREATE OR REPLACE FUNCTION public.autofill_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    NEW.org_id := public.current_org_id();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'contacts', 'conversations', 'messages', 'tags', 'custom_fields',
    'message_templates', 'pipelines', 'deals', 'broadcasts', 'whatsapp_config'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_autofill_org_id ON %I', t
    );
    EXECUTE format(
      'CREATE TRIGGER trg_autofill_org_id BEFORE INSERT ON %I
       FOR EACH ROW EXECUTE FUNCTION public.autofill_org_id()', t
    );
  END LOOP;
END $$;

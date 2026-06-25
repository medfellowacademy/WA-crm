-- ============================================================
-- Broadcast Queue
--
-- Adds server-side queue processing support for broadcasts.
-- Previously sending ran in the browser — closing the tab would
-- abort an in-progress broadcast. Now the browser just creates
-- the broadcast + recipients and the server takes over.
--
-- Changes:
--   1. Adds 'queued' to broadcasts.status CHECK constraint so the
--      browser can hand off to the server without racing.
--   2. Adds processing_started_at so the cron can detect stalled
--      broadcasts and retry them.
--   3. Adds index on (status, processing_started_at) for fast
--      queue polling.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- Widen the status CHECK to include 'queued'
ALTER TABLE broadcasts
  DROP CONSTRAINT IF EXISTS broadcasts_status_check;

ALTER TABLE broadcasts
  ADD CONSTRAINT broadcasts_status_check
  CHECK (status IN ('draft', 'scheduled', 'queued', 'sending', 'sent', 'failed'));

-- Track when processing started so stalled jobs can be retried
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- Fast polling index for the queue cron
CREATE INDEX IF NOT EXISTS idx_broadcasts_queue
  ON broadcasts (status, processing_started_at)
  WHERE status IN ('queued', 'sending');

-- Fast index for picking up pending recipients for a broadcast
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_pending
  ON broadcast_recipients (broadcast_id, status)
  WHERE status = 'pending';

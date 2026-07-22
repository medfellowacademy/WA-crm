'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Broadcast } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Radio, Plus, Loader2 } from 'lucide-react';
import { ModuleHelpBanner } from '@/components/ui/module-help-banner';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { getBroadcastStatus } from '@/lib/broadcast-status';

/**
 * Poll cadence while any broadcast is sending. Kept modest so we don't
 * beat on Supabase — the aggregate trigger in migration 003 keeps
 * counts consistent; we just need to surface the freshest snapshot.
 */
const POLL_INTERVAL_MS = 5_000;

function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function RateCell({
  value,
  total,
  color,
}: {
  value: number;
  total: number;
  /** Tailwind bg class for the fill, e.g. "bg-primary" */
  color: string;
}) {
  const pct = percent(value, total);
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right text-xs tabular-nums text-slate-300">
        {pct}%
      </span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BroadcastsPage() {
  const router = useRouter();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Used to kick off polling only while something is actively sending.
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchBroadcasts() {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setBroadcasts(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const anySending = useMemo(
    () => broadcasts.some((b) => b.status === 'sending'),
    [broadcasts],
  );

  useEffect(() => {
    function startPolling() {
      if (pollTimer.current) return;
      pollTimer.current = setInterval(fetchBroadcasts, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (!pollTimer.current) return;
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    // Pause polling while the tab is hidden — keeps Supabase cold when
    // the user is away, and ensures a fresh fetch the moment they
    // refocus so they don't see stale data on return.
    function handleVisibilityChange() {
      if (!anySending) return;
      if (document.visibilityState === 'hidden') {
        stopPolling();
      } else {
        fetchBroadcasts();
        startPolling();
      }
    }

    if (anySending && document.visibilityState === 'visible') {
      startPolling();
    } else {
      stopPolling();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [anySending]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleHelpBanner storageKey="wacrm_help_broadcasts" title="What are Broadcasts?">
        <p>Broadcasts let you send a single WhatsApp message to hundreds of contacts at once — for promotions, updates, or reminders.</p>
        <p className="mt-1"><span className="font-medium text-slate-300">Before you send:</span> you need at least one approved Meta message template. Templates are created in the Meta Business Manager.</p>
        <p className="mt-1"><span className="font-medium text-slate-300">Tip:</span> Import your contacts first so you have an audience to send to.</p>
      </ModuleHelpBanner>

      {/* Top indeterminate progress bar: only visible while a broadcast
          is mid-send. Pure CSS animation so no extra deps. */}
      {anySending && (
        <div
          role="progressbar"
          aria-label="Broadcast in progress"
          className="broadcast-indeterminate fixed inset-x-0 top-0 z-40 h-0.5 overflow-hidden bg-slate-800"
        >
          <div className="broadcast-indeterminate-bar h-0.5 bg-primary" />
          <style jsx>{`
            .broadcast-indeterminate-bar {
              width: 33%;
              transform: translateX(-100%);
              animation: broadcast-slide 1.6s cubic-bezier(0.4, 0, 0.2, 1)
                infinite;
            }
            @keyframes broadcast-slide {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(400%);
              }
            }
          `}</style>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Broadcasts</h1>
            <HelpTooltip side="bottom">
              <p>Broadcasts send a WhatsApp template message to many contacts at once.</p>
              <p className="mt-1.5">Meta requires all bulk messages to use a pre-approved template. Once approved, you pick a template, choose an audience (all contacts, a tag, or a CSV), and hit Send.</p>
              <p className="mt-1.5">Delivery, read, and reply rates appear in the table after sending.</p>
            </HelpTooltip>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Send bulk messages to your contacts using approved templates.
          </p>
        </div>
        <Button
          onClick={() => router.push('/broadcasts/new')}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Broadcast
        </Button>
      </div>

      {broadcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
            <Radio className="h-6 w-6 text-slate-500" />
          </div>
          <p className="mt-4 text-base font-medium text-white">No broadcasts yet</p>
          <p className="mt-1.5 max-w-sm text-sm text-slate-400">
            Send a WhatsApp message to hundreds of contacts at once. Perfect for promotions, reminders, and updates.
          </p>
          <div className="mt-6 grid max-w-sm grid-cols-1 gap-2 text-left sm:grid-cols-3">
            {[
              { n: 1, label: 'Import contacts', href: '/contacts' },
              { n: 2, label: 'Approve a template in Meta', href: null },
              { n: 3, label: 'Create your first broadcast', href: null },
            ].map(({ n, label, href }) => (
              <div key={n} className="flex items-start gap-2 rounded-lg border border-slate-800 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-primary">{n}</span>
                {href ? (
                  <a href={href} className="text-xs text-primary underline-offset-2 hover:underline">{label}</a>
                ) : (
                  <span className="text-xs text-slate-400">{label}</span>
                )}
              </div>
            ))}
          </div>
          <Button
            onClick={() => router.push('/broadcasts/new')}
            className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Broadcast
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Name</TableHead>
                <TableHead className="hidden text-slate-400 md:table-cell">Template</TableHead>
                <TableHead className="hidden text-right text-slate-400 sm:table-cell">
                  Recipients
                </TableHead>
                <TableHead className="hidden text-slate-400 lg:table-cell">Delivery</TableHead>
                <TableHead className="hidden text-slate-400 lg:table-cell">Read</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="hidden text-slate-400 sm:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.map((broadcast) => {
                const status = getBroadcastStatus(broadcast.status);
                return (
                  <TableRow
                    key={broadcast.id}
                    className="cursor-pointer border-slate-800 hover:bg-slate-800/50"
                    onClick={() => router.push(`/broadcasts/${broadcast.id}`)}
                  >
                    <TableCell className="font-medium text-white">
                      {broadcast.name}
                    </TableCell>
                    <TableCell className="hidden text-slate-300 md:table-cell">
                      {broadcast.template_name}
                    </TableCell>
                    <TableCell className="hidden text-right text-slate-300 tabular-nums sm:table-cell">
                      {broadcast.total_recipients}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <RateCell
                        value={broadcast.delivered_count}
                        total={broadcast.total_recipients}
                        color="bg-primary"
                      />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <RateCell
                        value={broadcast.read_count}
                        total={broadcast.total_recipients}
                        color="bg-blue-500"
                      />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${status.classes}`}
                      >
                        {status.pulse && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-400" />
                          </span>
                        )}
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-slate-400 sm:table-cell">
                      {new Date(broadcast.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

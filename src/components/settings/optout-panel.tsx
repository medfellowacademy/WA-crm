'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { UserMinus, UserCheck, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface OptOutRow {
  id: string;
  contact_id: string;
  opted_out_at: string;
  keyword: string | null;
  contact: {
    id: string;
    name: string | null;
    phone: string;
    avatar_url: string | null;
  } | null;
}

export function OptOutPanel() {
  const [optouts, setOptouts] = useState<OptOutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [resubscribing, setResubscribing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/optouts');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setOptouts(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      toast.error('Failed to load opt-out list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resubscribe = async (contactId: string) => {
    setResubscribing(contactId);
    try {
      const res = await fetch('/api/optouts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Contact re-subscribed');
      setOptouts((prev) => prev.filter((o) => o.contact_id !== contactId));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      toast.error('Failed to re-subscribe');
    } finally {
      setResubscribing(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle>Opt-out Management</CardTitle>
              <CardDescription>
                Contacts who texted STOP, UNSUBSCRIBE, or similar keywords. They are
                automatically excluded from all broadcasts.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {total > 0 && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                {total} opted out
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Info banner */}
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm text-blue-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
          <div>
            <p className="font-medium text-blue-200">Automatic keyword detection</p>
            <p className="mt-0.5 text-blue-300/80">
              When a contact texts <strong>STOP</strong>, UNSUBSCRIBE, QUIT, END, or CANCEL — they are
              automatically added here. Texts <strong>START</strong> or YES to re-subscribe automatically.
              You can also manually re-subscribe below.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : optouts.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <UserCheck className="h-6 w-6 text-green-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-white">No opt-outs</p>
            <p className="mt-1 text-xs text-slate-400">
              All your contacts are currently subscribed to receive messages.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {optouts.map((row) => {
              const contact = row.contact;
              const name = contact?.name || contact?.phone || 'Unknown';
              return (
                <div key={row.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-slate-700 text-sm text-white">
                        {name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-white">{name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-400">{contact?.phone}</p>
                        {row.keyword && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-400">
                            "{row.keyword.toUpperCase()}"
                          </Badge>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {formatDistanceToNow(new Date(row.opted_out_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resubscribe(row.contact_id)}
                    disabled={resubscribing === row.contact_id}
                    className="text-xs border-slate-700 text-slate-300 hover:text-white hover:border-green-500/50 hover:bg-green-500/5"
                  >
                    {resubscribing === row.contact_id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <UserMinus className="h-3 w-3 mr-1" />
                        Re-subscribe
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

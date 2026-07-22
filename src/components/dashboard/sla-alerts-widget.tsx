'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SlaAlert {
  id: string;
  alert_type: 'first_response' | 'resolution';
  breached_at: string;
  conversation: {
    id: string;
    status: string;
    contact: { id: string; name: string | null; phone: string } | null;
  } | null;
}

export function SlaAlertsWidget() {
  const [alerts, setAlerts] = useState<SlaAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sla-alerts')
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((d) => setAlerts(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            SLA Breaches
          </CardTitle>
          {alerts.length > 0 && (
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
              {alerts.length} active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
            <p className="mt-2 text-xs text-slate-400">All SLAs on track</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const contact = alert.conversation?.contact;
              const name = contact?.name || contact?.phone || 'Unknown';
              const label = alert.alert_type === 'first_response' ? 'No first reply' : 'Unresolved';
              return (
                <Link
                  key={alert.id}
                  href={`/inbox?c=${alert.conversation?.id}`}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 transition-colors hover:bg-slate-800/60",
                    alert.alert_type === 'first_response'
                      ? "border-amber-500/20 bg-amber-500/5"
                      : "border-red-500/20 bg-red-500/5"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">{name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0 border-0",
                          alert.alert_type === 'first_response'
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-red-500/20 text-red-300"
                        )}
                      >
                        {label}
                      </Badge>
                      <span className="text-[10px] text-slate-500">
                        <Clock className="inline h-2.5 w-2.5 mr-0.5" />
                        {formatDistanceToNow(new Date(alert.breached_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

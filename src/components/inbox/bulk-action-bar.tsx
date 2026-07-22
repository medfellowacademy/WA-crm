'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  X,
  CheckSquare,
  XSquare,
  RotateCcw,
  UserCheck,
  Tag,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  full_name: string | null;
  email: string;
}

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface BulkActionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onActionDone: () => void;
  agents?: Agent[];
  tags?: Tag[];
}

export function BulkActionBar({
  selectedIds,
  onClearSelection,
  onActionDone,
  agents = [],
  tags = [],
}: BulkActionBarProps) {
  const [loading, setLoading] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  const run = async (action: object, key: string) => {
    setLoading(key);
    try {
      const res = await fetch('/api/conversations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationIds: selectedIds, action }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const { affected } = await res.json();
      toast.success(`Updated ${affected} conversation${affected === 1 ? '' : 's'}`);
      onClearSelection();
      onActionDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(null);
    }
  };

  const busy = loading !== null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 z-50 -translate-x-1/2',
        'flex items-center gap-2 rounded-xl border border-slate-700',
        'bg-slate-900 px-4 py-2.5 shadow-2xl shadow-black/40',
        'transition-all animate-in slide-in-from-bottom-4 duration-200',
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-1.5 pr-3 border-r border-slate-700">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-white tabular-nums">
          {selectedIds.length}
        </span>
        <span className="text-xs text-slate-400">selected</span>
      </div>

      {/* Mark read */}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-slate-300 hover:text-white hover:bg-slate-800"
        onClick={() => run({ type: 'mark_read' }, 'read')}
        disabled={busy}
      >
        {loading === 'read' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
        Mark read
      </Button>

      {/* Close */}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-slate-300 hover:text-white hover:bg-slate-800"
        onClick={() => run({ type: 'close' }, 'close')}
        disabled={busy}
      >
        {loading === 'close' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XSquare className="h-3.5 w-3.5" />}
        Close
      </Button>

      {/* Reopen */}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-slate-300 hover:text-white hover:bg-slate-800"
        onClick={() => run({ type: 'reopen' }, 'reopen')}
        disabled={busy}
      >
        {loading === 'reopen' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        Reopen
      </Button>

      {/* Assign */}
      {agents.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <UserCheck className="h-3.5 w-3.5" />
            Assign
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="border-slate-700 bg-slate-800 mb-2"
          >
            <DropdownMenuItem
              className="text-slate-300 text-xs focus:bg-slate-700"
              onClick={() => run({ type: 'assign', agentId: null }, 'assign')}
            >
              Unassign
            </DropdownMenuItem>
            {agents.map((a) => (
              <DropdownMenuItem
                key={a.id}
                className="text-slate-300 text-xs focus:bg-slate-700"
                onClick={() => run({ type: 'assign', agentId: a.id }, 'assign')}
              >
                {a.full_name || a.email}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Tag */}
      {tags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Tag className="h-3.5 w-3.5" />
            Tag
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="border-slate-700 bg-slate-800 mb-2 max-h-48 overflow-y-auto"
          >
            {tags.map((t) => (
              <DropdownMenuItem
                key={t.id}
                className="text-slate-300 text-xs focus:bg-slate-700 flex items-center gap-2"
                onClick={() => run({ type: 'tag', tagId: t.id }, 'tag')}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: t.color ?? '#64748b' }}
                />
                {t.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Dismiss */}
      <div className="pl-2 border-l border-slate-700">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

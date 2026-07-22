"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationStatus } from "@/types";
import { Search, ChevronDown, AlertTriangle, MessageSquare, Settings, PhoneCall, Phone, CheckSquare, Square } from "lucide-react";
import { SentimentBadge } from "./sentiment-badge";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationListProps {
  activeConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  conversations: Conversation[];
  onConversationsLoaded: (conversations: Conversation[]) => void;
  resyncToken?: number;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

const STATUS_COLORS: Record<ConversationStatus, string> = {
  open: "bg-primary",
  pending: "bg-amber-500",
  closed: "bg-slate-500",
};

const STATUS_FILTER_OPTIONS: { label: string; value: ConversationStatus | "all" }[] = [
  { label: "All Status", value: "all" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Closed", value: "closed" },
];

// SLA: open conversations not updated in > 60 min are "overdue"
const SLA_OPEN_MINUTES = 60;
const SLA_PENDING_MINUTES = 240;

function isSlaBreached(conv: Conversation): boolean {
  if (conv.status === "closed") return false;
  const lastActivity = conv.last_message_at ?? conv.updated_at ?? conv.created_at;
  const minutesIdle = differenceInMinutes(new Date(), new Date(lastActivity));
  if (conv.status === "open") return minutesIdle > SLA_OPEN_MINUTES;
  if (conv.status === "pending") return minutesIdle > SLA_PENDING_MINUTES;
  return false;
}

type AssignFilter = "all" | "mine" | "unassigned";

const ASSIGN_TABS: { label: string; value: AssignFilter }[] = [
  { label: "All", value: "all" },
  { label: "Mine", value: "mine" },
  { label: "Unassigned", value: "unassigned" },
];

export function ConversationList({
  activeConversationId,
  onSelect,
  conversations,
  onConversationsLoaded,
  resyncToken = 0,
  selectedIds = [],
  onSelectionChange,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("all");
  const [assignFilter, setAssignFilter] = useState<AssignFilter>("all");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [waNumberCount, setWaNumberCount] = useState(0);

  const onConversationsLoadedRef = useRef(onConversationsLoaded);
  useEffect(() => {
    onConversationsLoadedRef.current = onConversationsLoaded;
  });

  // Get current user id for "Mine" filter
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      // Fetch conversations and WA number count in parallel
      const [convResult, numResult] = await Promise.all([
        supabase
          .from("conversations")
          .select("*, contact:contacts(*), whatsapp_number:whatsapp_numbers(id, label, display_phone)")
          .order("last_message_at", { ascending: false }),
        supabase
          .from("whatsapp_numbers")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

      if (cancelled) return;

      if (convResult.error) {
        console.error("Failed to fetch conversations:", {
          message: convResult.error.message,
          details: convResult.error.details,
          hint: convResult.error.hint,
          code: convResult.error.code,
        });
        setLoading(false);
        return;
      }

      onConversationsLoadedRef.current(convResult.data ?? []);
      setWaNumberCount(numResult.count ?? 0);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [resyncToken]);

  const filtered = useMemo(() => {
    let result = conversations;

    // Assignment filter
    if (assignFilter === "mine" && currentUserId) {
      result = result.filter((c) => c.assigned_agent_id === currentUserId);
    } else if (assignFilter === "unassigned") {
      result = result.filter((c) => !c.assigned_agent_id);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = c.contact?.name?.toLowerCase() ?? "";
        const phone = c.contact?.phone?.toLowerCase() ?? "";
        const lastMsg = c.last_message_text?.toLowerCase() ?? "";
        return name.includes(q) || phone.includes(q) || lastMsg.includes(q);
      });
    }

    return result;
  }, [conversations, statusFilter, assignFilter, search, currentUserId]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); },
    []
  );

  const handleSelect = useCallback(
    (conv: Conversation) => { onSelect(conv); },
    [onSelect]
  );

  const activeStatusFilter = STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter);

  // Per-tab counts
  const counts = useMemo(() => {
    const base = statusFilter !== "all"
      ? conversations.filter((c) => c.status === statusFilter)
      : conversations;
    return {
      all: base.length,
      mine: base.filter((c) => c.assigned_agent_id === currentUserId).length,
      unassigned: base.filter((c) => !c.assigned_agent_id).length,
    };
  }, [conversations, statusFilter, currentUserId]);

  return (
    <div className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-900 lg:w-80">
      {/* Bulk select header */}
      {onSelectionChange && filtered.length > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-700 px-3 py-1.5 bg-slate-800/50">
          <button
            onClick={() => {
              const allIds = filtered.map((c) => c.id);
              const allSelected = allIds.every((id) => selectedIds.includes(id));
              onSelectionChange(allSelected ? [] : allIds);
            }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            {filtered.every((c) => selectedIds.includes(c.id)) ? (
              <CheckSquare className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={() => onSelectionChange([])}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="space-y-2 border-b border-slate-800 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder="Search conversations..."
            className="border-slate-700 bg-slate-800 pl-9 text-sm text-white placeholder-slate-500 focus:border-primary/50"
          />
        </div>

        {/* Assignment filter tabs */}
        <div className="flex items-center gap-1">
          {ASSIGN_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setAssignFilter(tab.value)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                assignFilter === tab.value
                  ? "bg-primary/10 text-primary"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              {tab.label}
              <span className={cn(
                "rounded-full px-1 text-[10px] tabular-nums",
                assignFilter === tab.value ? "bg-primary/20 text-primary" : "text-slate-500"
              )}>
                {counts[tab.value]}
              </span>
            </button>
          ))}

          {/* Status dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800">
              {activeStatusFilter?.value === "all" ? "Status" : activeStatusFilter?.label}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-slate-700 bg-slate-800">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={cn("text-sm", statusFilter === opt.value ? "text-primary" : "text-slate-300")}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conversation Items */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : conversations.length === 0 ? (
          <InboxEmptyState />
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-slate-500">No conversations match this filter.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={handleSelect}
                currentUserId={currentUserId}
                showNumberBadge={waNumberCount > 1}
                isSelected={selectedIds.includes(conv.id)}
                onToggleSelect={onSelectionChange ? (id) => {
                  const next = selectedIds.includes(id)
                    ? selectedIds.filter((x) => x !== id)
                    : [...selectedIds, id];
                  onSelectionChange(next);
                } : undefined}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversation: Conversation) => void;
  currentUserId: string | null;
  showNumberBadge?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  currentUserId,
  showNumberBadge = false,
  isSelected = false,
  onToggleSelect,
}: ConversationItemProps) {
  const contact = conversation.contact;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const waNumber = (conversation as any).whatsapp_number as
    | { id: string; label: string; display_phone: string }
    | null
    | undefined;
  const displayName = contact?.name || contact?.phone || "Unknown";
  const initials = displayName.charAt(0).toUpperCase();

  const handleClick = useCallback(() => {
    onSelect(conversation);
  }, [onSelect, conversation]);

  const timeAgo = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })
    : "";

  const isAssignedToMe = conversation.assigned_agent_id === currentUserId;
  const slaBreached = isSlaBreached(conversation);

  return (
    <div
      className={cn(
        "group flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-800/50",
        isActive && "border-l-2 border-primary bg-slate-800/70",
        isSelected && !isActive && "border-l-2 border-primary/40 bg-primary/5",
        slaBreached && !isActive && !isSelected && "border-l-2 border-amber-500/60"
      )}
    >
      {/* Checkbox — shown when selection mode is active or on hover */}
      {onToggleSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(conversation.id); }}
          className={cn(
            "mt-1 shrink-0 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {isSelected
            ? <CheckSquare className="h-4 w-4 text-primary" />
            : <Square className="h-4 w-4 text-slate-500" />}
        </button>
      )}
      <button onClick={handleClick} className="flex flex-1 items-start gap-3 text-left min-w-0">
      {/* Avatar */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">
        {contact?.avatar_url ? (
          <img src={contact.avatar_url} alt={displayName} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          initials
        )}
        {isAssignedToMe && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-primary" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-white">{displayName}</span>
          <div className="flex shrink-0 items-center gap-1">
            {slaBreached && (
              <span title="SLA overdue"><AlertTriangle className="h-3 w-3 text-amber-400" /></span>
            )}
            <span className="text-[10px] text-slate-500">{timeAgo}</span>
          </div>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-slate-400">
            {conversation.last_message_text || "No messages yet"}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {showNumberBadge && waNumber?.display_phone && (
              <span
                className="flex items-center gap-0.5 rounded bg-slate-700 px-1 py-0.5 text-[9px] font-medium text-slate-300"
                title={waNumber.label || waNumber.display_phone}
              >
                <Phone className="h-2 w-2" />
                {waNumber.display_phone.replace(/\s/g, "").slice(-4)}
              </span>
            )}
            <SentimentBadge sentiment={conversation.sentiment} size="xs" />
            {conversation.unread_count > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {conversation.unread_count}
              </span>
            )}
            <span
              className={cn("h-2 w-2 rounded-full", STATUS_COLORS[conversation.status])}
              title={conversation.status}
            />
          </div>
        </div>
      </div>
      </button>
    </div>
  );
}

function InboxEmptyState() {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
        <MessageSquare className="h-6 w-6 text-slate-500" />
      </div>
      <p className="mt-3 text-sm font-medium text-white">No conversations yet</p>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
        Messages from your WhatsApp number will appear here automatically.
      </p>

      <div className="mt-6 w-full space-y-2 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          How to get started
        </p>
        <Step n={1} icon={Settings} href="/settings?tab=whatsapp">
          Connect your WhatsApp number in Settings
        </Step>
        <Step n={2} icon={PhoneCall} href={null}>
          Send a WhatsApp message <em>to</em> that number from any phone
        </Step>
        <Step n={3} icon={MessageSquare} href={null}>
          The conversation will appear here within seconds
        </Step>
      </div>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  href,
  children,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string | null;
  children: React.ReactNode;
}) {
  const inner = (
    <div className="flex items-start gap-2 rounded-md px-3 py-2 text-left">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-400">
        {n}
      </span>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
      <span className="text-xs text-slate-400 leading-snug">{children}</span>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block rounded-md border border-slate-800 hover:border-primary/30 hover:bg-slate-800/50 transition-colors">
        {inner}
      </a>
    );
  }
  return (
    <div className="rounded-md border border-slate-800">
      {inner}
    </div>
  );
}

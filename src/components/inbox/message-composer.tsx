"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent, useLayoutEffect } from "react";
import { Send, LayoutTemplate, Lock, MessageSquare, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReplyQuote } from "./reply-quote";
import { ProductPicker } from "./product-picker";

interface ReplyDraft {
  id: string;
  authorLabel: string;
  preview: string;
}

interface QuickReply {
  id: string;
  shortcut: string;
  message: string;
}

interface MessageComposerProps {
  conversationId: string;
  sessionExpired: boolean;
  onSend: (text: string, replyToId?: string, isInternal?: boolean) => void;
  onOpenTemplates: () => void;
  replyTo?: ReplyDraft | null;
  onClearReply?: () => void;
  prefillText?: string | null;
  onPrefillConsumed?: () => void;
}

export function MessageComposer({
  conversationId,
  sessionExpired,
  onSend,
  onOpenTemplates,
  replyTo,
  onClearReply,
  prefillText,
  onPrefillConsumed,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const [selectedQRIndex, setSelectedQRIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const quickRepliesRef = useRef<HTMLDivElement>(null);

  // Load quick replies once
  useEffect(() => {
    fetch("/api/quick-replies")
      .then((r) => r.json())
      .then((d) => setQuickReplies(d.replies ?? []))
      .catch(() => {});
  }, []);

  // Reset internal note when conversation changes
  useEffect(() => {
    setIsInternal(false);
    setText("");
    setShowQuickReplies(false);
  }, [conversationId]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  // Consume prefill text from AI suggestion
  useLayoutEffect(() => {
    if (!prefillText) return;
    setText(prefillText);
    onPrefillConsumed?.();
    setTimeout(() => {
      adjustHeight();
      textareaRef.current?.focus();
    }, 0);
  }, [prefillText, onPrefillConsumed, adjustHeight]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || (sessionExpired && !isInternal)) return;

    setSending(true);
    try {
      onSend(trimmed, replyTo?.id, isInternal);
      setText("");
      setIsInternal(false);
      setShowQuickReplies(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setSending(false);
    }
  }, [text, sending, sessionExpired, isInternal, onSend, replyTo?.id]);

  const filteredQuickReplies = quickReplies.filter(
    (qr) =>
      qr.shortcut.toLowerCase().includes(quickFilter.toLowerCase()) ||
      qr.message.toLowerCase().includes(quickFilter.toLowerCase())
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setText(val);
      adjustHeight();

      // Detect "/" at start of text to trigger quick replies
      if (val === "/" || (val.startsWith("/") && !val.includes(" "))) {
        setQuickFilter(val.slice(1));
        setShowQuickReplies(true);
        setSelectedQRIndex(0);
      } else {
        setShowQuickReplies(false);
      }
    },
    [adjustHeight]
  );

  const applyQuickReply = useCallback(
    (qr: QuickReply) => {
      setText(qr.message);
      setShowQuickReplies(false);
      setQuickFilter("");
      setTimeout(() => {
        adjustHeight();
        textareaRef.current?.focus();
      }, 0);
    },
    [adjustHeight]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (showQuickReplies && filteredQuickReplies.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedQRIndex((i) => Math.min(i + 1, filteredQuickReplies.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedQRIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          applyQuickReply(filteredQuickReplies[selectedQRIndex]);
          return;
        }
        if (e.key === "Escape") {
          setShowQuickReplies(false);
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, showQuickReplies, filteredQuickReplies, selectedQRIndex, applyQuickReply]
  );

  const canSend = !!text.trim() && !sending && (!sessionExpired || isInternal);

  return (
    <div
      className={cn(
        "relative border-t bg-slate-900 p-3",
        isInternal ? "border-amber-500/40" : "border-slate-800"
      )}
    >
      {/* Internal note banner */}
      {isInternal && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5">
          <Lock className="h-3 w-3 text-amber-400" />
          <span className="text-xs text-amber-400 font-medium">Internal note — only visible to your team</span>
        </div>
      )}

      {replyTo && (
        <div className="mb-2">
          <ReplyQuote
            authorLabel={replyTo.authorLabel}
            preview={replyTo.preview}
            onDismiss={onClearReply}
          />
        </div>
      )}

      {sessionExpired && !isInternal && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-400">
            24-hour session expired. Use a template to re-engage.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-amber-400 hover:text-amber-300"
            onClick={onOpenTemplates}
          >
            <LayoutTemplate className="mr-1 h-3 w-3" />
            Templates
          </Button>
        </div>
      )}

      {/* Quick replies popup */}
      {showQuickReplies && filteredQuickReplies.length > 0 && (
        <div
          ref={quickRepliesRef}
          className="mb-2 max-h-48 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 shadow-lg"
        >
          {filteredQuickReplies.map((qr, i) => (
            <button
              key={qr.id}
              onMouseDown={(e) => {
                e.preventDefault();
                applyQuickReply(qr);
              }}
              className={cn(
                "flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-slate-700",
                i === selectedQRIndex && "bg-slate-700"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-primary">
                  /{qr.shortcut}
                </span>
              </div>
              <p className="truncate text-xs text-slate-300">{qr.message}</p>
            </button>
          ))}
        </div>
      )}

      {/* Product picker popup */}
      {showProductPicker && (
        <div className="absolute bottom-full right-0 mb-2 z-50">
          <ProductPicker
            conversationId={conversationId}
            onClose={() => setShowProductPicker(false)}
            onSent={() => setShowProductPicker(false)}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Template button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 shrink-0 p-0 text-slate-400 hover:text-white"
          onClick={onOpenTemplates}
          title="Send template"
        >
          <LayoutTemplate className="h-4 w-4" />
        </Button>

        {/* Product catalog button */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 w-9 shrink-0 p-0 hover:text-white",
            showProductPicker ? "text-primary" : "text-slate-400"
          )}
          onClick={() => setShowProductPicker((v) => !v)}
          title="Send product from catalog"
        >
          <ShoppingBag className="h-4 w-4" />
        </Button>

        {/* Internal note toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 w-9 shrink-0 p-0 hover:text-white",
            isInternal ? "text-amber-400" : "text-slate-400"
          )}
          onClick={() => setIsInternal((v) => !v)}
          title={isInternal ? "Switch to reply" : "Add internal note"}
        >
          {isInternal ? (
            <Lock className="h-4 w-4" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
        </Button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isInternal
              ? "Write an internal note... (only team can see)"
              : sessionExpired
              ? "Session expired - use a template"
              : "Type a message... or / for quick replies"
          }
          disabled={sessionExpired && !isInternal}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl border px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors",
            isInternal
              ? "border-amber-500/40 bg-amber-500/5 focus:border-amber-500/60"
              : "border-slate-700 bg-slate-800 focus:border-primary/50",
            sessionExpired && !isInternal && "cursor-not-allowed opacity-50"
          )}
        />

        <Button
          size="sm"
          className={cn(
            "h-9 w-9 shrink-0 p-0 disabled:opacity-40",
            isInternal
              ? "bg-amber-500 hover:bg-amber-500/90 text-white"
              : "bg-primary hover:bg-primary/90"
          )}
          disabled={!canSend}
          onClick={handleSend}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-1 pl-[4.5rem] text-[10px] text-slate-600">
        Type &apos;/&apos; for quick replies · Shift+Enter for new line
      </p>
    </div>
  );
}

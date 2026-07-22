"use client";

import { useState, useCallback } from "react";
import { Sparkles, X, CornerDownLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AiSuggestReplyProps {
  conversationId: string;
  onInsert: (text: string) => void;
  disabled?: boolean;
}

export function AiSuggestReply({ conversationId, onInsert, disabled }: AiSuggestReplyProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleSuggest = useCallback(async () => {
    setLoading(true);
    setSuggestion(null);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to get suggestion");
        return;
      }
      setSuggestion(data.suggestion);
    } catch {
      toast.error("Failed to get suggestion");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const handleDismiss = useCallback(() => setSuggestion(null), []);

  const handleUse = useCallback(() => {
    if (suggestion) {
      onInsert(suggestion);
      setSuggestion(null);
    }
  }, [suggestion, onInsert]);

  return (
    <div className="px-3 pb-1">
      {suggestion ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                AI Suggestion
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{suggestion}</p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleUse}
              className="h-7 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              <CornerDownLeft className="h-3 w-3" />
              Use this reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSuggest}
              className="h-7 text-xs text-slate-400 hover:text-white"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSuggest}
          disabled={loading || disabled}
          className={cn(
            "h-7 gap-1.5 text-xs text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors",
            loading && "opacity-60"
          )}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {loading ? "Thinking…" : "AI Suggest Reply"}
        </Button>
      )}
    </div>
  );
}

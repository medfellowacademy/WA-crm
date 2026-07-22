'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Bot, Sparkles, AlertCircle, Save, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface AgentConfig {
  is_enabled: boolean;
  system_prompt: string;
  handoff_message: string;
  handoff_keywords: string[];
  auto_assign_on_handoff: boolean;
  model: string;
  max_autonomous_turns: number;
  has_anthropic_key: boolean;
}

const DEFAULT_CONFIG: AgentConfig = {
  is_enabled: false,
  system_prompt: '',
  handoff_message: '',
  handoff_keywords: [],
  auto_assign_on_handoff: true,
  model: 'claude-opus-4-8',
  max_autonomous_turns: 6,
  has_anthropic_key: false,
};

export function AiAgentPanel() {
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/agent-config');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setConfig({ ...DEFAULT_CONFIG, ...json });
    } catch {
      toast.error('Failed to load AI agent settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/ai/agent-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('AI agent settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (!kw || config.handoff_keywords.includes(kw)) return;
    setConfig((c) => ({ ...c, handoff_keywords: [...c.handoff_keywords, kw] }));
    setNewKeyword('');
  };

  const removeKeyword = (kw: string) => {
    setConfig((c) => ({ ...c, handoff_keywords: c.handoff_keywords.filter((k) => k !== kw) }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Autonomous AI Agent</CardTitle>
                <CardDescription>
                  Let Claude reply to customers automatically on unassigned conversations,
                  handing off to a human when requested or after a turn limit.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, is_enabled: v }))}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {!config.has_anthropic_key && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="font-medium text-amber-200">ANTHROPIC_API_KEY not configured</p>
                <p className="mt-0.5 text-amber-300/80">
                  Add ANTHROPIC_API_KEY to your environment variables to enable the autonomous agent.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> System prompt
            </Label>
            <Textarea
              value={config.system_prompt}
              onChange={(e) => setConfig((c) => ({ ...c, system_prompt: e.target.value }))}
              placeholder="You are a helpful WhatsApp customer support agent..."
              className="min-h-24 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Handoff message</Label>
            <Textarea
              value={config.handoff_message}
              onChange={(e) => setConfig((c) => ({ ...c, handoff_message: e.target.value }))}
              placeholder="Let me get a member of our team to help you with that."
              className="min-h-16 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
            <p className="text-xs text-slate-500">Sent when a customer asks for a human, before handing off.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Handoff keywords</Label>
            <div className="flex flex-wrap gap-1.5">
              {config.handoff_keywords.map((kw) => (
                <Badge
                  key={kw}
                  variant="outline"
                  className="text-xs border-slate-700 text-slate-300 gap-1"
                >
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                placeholder="Add keyword (e.g. agent, human)"
                className="h-8 text-xs bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
              <Button variant="outline" size="sm" onClick={addKeyword} className="h-8 shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-800 p-3">
            <div>
              <p className="text-sm font-medium text-white">Auto-assign on handoff</p>
              <p className="text-xs text-slate-400">Mark conversation as pending so a human agent picks it up.</p>
            </div>
            <Switch
              checked={config.auto_assign_on_handoff}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, auto_assign_on_handoff: v }))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Max autonomous turns</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={config.max_autonomous_turns}
              onChange={(e) => setConfig((c) => ({ ...c, max_autonomous_turns: Number(e.target.value) || 1 }))}
              className="h-9 w-32 bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-500">After this many AI replies on a conversation, it's handed off automatically.</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={saving} size="sm">
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? 'Saving...' : 'Save settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

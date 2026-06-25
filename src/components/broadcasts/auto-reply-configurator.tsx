'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageCircle, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';

interface AutoReplyConfig {
  enabled: boolean;
  type: 'template' | 'text';
  templateName?: string;
  templateLanguage?: string;
  text?: string;
  buttonIds?: string[];
}

interface AutoReplyConfiguratorProps {
  config: AutoReplyConfig;
  onConfigChange: (config: AutoReplyConfig) => void;
  campaignTemplate: MessageTemplate | null;
  onNext?: () => void;
  onBack?: () => void;
}

export function AutoReplyConfigurator({
  config,
  onConfigChange,
  campaignTemplate,
  onNext,
  onBack,
}: AutoReplyConfiguratorProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [buttonOptions, setButtonOptions] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!config.enabled) return;

    async function fetchTemplates() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('message_templates')
          .select('*')
          .eq('status', 'Approved')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTemplates(data ?? []);
      } catch (err) {
        console.error('Failed to load templates:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, [config.enabled]);

  // Extract button reply options from campaign template
  useEffect(() => {
    if (!campaignTemplate?.buttons) {
      setButtonOptions([]);
      return;
    }

    const buttons = (campaignTemplate.buttons as any[])?.filter(
      (btn) => btn.type === 'REPLY',
    ) ?? [];

    const options = buttons.map((btn) => ({
      id: btn.reply_id || '',
      title: btn.title || '',
    }));

    setButtonOptions(options);
  }, [campaignTemplate]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Auto-Reply Configuration</h2>
        <p className="mt-1 text-sm text-slate-400">
          Set up automatic responses when recipients click buttons in your campaign.
        </p>
      </div>

      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <MessageCircle className="h-5 w-5" />
                Auto-Reply Configuration
              </CardTitle>
              <CardDescription className="text-slate-400">
                Automatically reply when recipients click buttons in your campaign template
              </CardDescription>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) =>
                onConfigChange({
                  ...config,
                  enabled: checked,
                })
              }
            />
          </div>
        </CardHeader>

        {config.enabled && (
          <CardContent className="space-y-4 border-t border-slate-700 pt-4">
            {buttonOptions.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-center">
                <p className="text-sm text-slate-400">
                  Your campaign template has no button replies to configure auto-reply for.
                </p>
              </div>
            ) : (
              <>
                {/* Button Selection */}
                <div>
                  <Label className="text-sm font-medium text-slate-300">
                    Trigger for buttons (select which button responses trigger auto-reply)
                  </Label>
                  <div className="mt-2 space-y-2">
                    {buttonOptions.map((btn) => {
                      const isSelected = (config.buttonIds ?? []).includes(btn.id);
                      return (
                        <button
                          key={btn.id}
                          onClick={() => {
                            const ids = config.buttonIds ?? [];
                            const newIds = isSelected
                              ? ids.filter((id) => id !== btn.id)
                              : [...ids, btn.id];
                            onConfigChange({
                              ...config,
                              buttonIds: newIds,
                            });
                          }}
                          className={`w-full flex items-center justify-between rounded border p-3 text-left transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                          }`}
                        >
                          <span className="text-sm text-slate-300">{btn.title}</span>
                          <div
                            className={`h-4 w-4 rounded border ${
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-slate-500 bg-slate-800'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Auto-Reply Type */}
                <div>
                  <Label htmlFor="reply-type" className="text-sm font-medium text-slate-300">
                    Reply Type
                  </Label>
                  <Select
                    value={config.type}
                    onValueChange={(value) =>
                      onConfigChange({
                        ...config,
                        type: value as 'template' | 'text',
                      })
                    }
                  >
                    <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-900">
                      <SelectItem value="template">Use Template</SelectItem>
                      <SelectItem value="text">Custom Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Template Selection */}
                {config.type === 'template' && (
                  <div>
                    <Label htmlFor="reply-template" className="text-sm font-medium text-slate-300">
                      Template
                    </Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={config.templateName || ''}
                        onValueChange={(templateName) => {
                          const selected = templates.find((t) => t.name === templateName);
                          onConfigChange({
                            ...config,
                            templateName,
                            templateLanguage: selected?.language ?? 'en_US',
                          });
                        }}
                      >
                        <SelectTrigger className="border-slate-700 bg-slate-800 text-white flex-1">
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-900">
                          {loading ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                          ) : templates.length === 0 ? (
                            <div className="p-2 text-xs text-slate-400">No approved templates</div>
                          ) : (
                            templates.map((t) => (
                              <SelectItem key={t.id} value={t.name}>
                                {t.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Custom Text */}
                {config.type === 'text' && (
                  <div>
                    <Label htmlFor="reply-text" className="text-sm font-medium text-slate-300">
                      Reply Message
                    </Label>
                    <Textarea
                      id="reply-text"
                      value={config.text || ''}
                      onChange={(e) =>
                        onConfigChange({
                          ...config,
                          text: e.target.value,
                        })
                      }
                      placeholder="Type your auto-reply message..."
                      className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                      rows={3}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Must be within 24-hour customer service window
                    </p>
                  </div>
                )}

                {/* Info */}
                <div className="rounded-lg border border-slate-700/50 bg-blue-950/20 p-3 text-xs text-blue-300">
                  <p>
                    ℹ️ Auto-replies will be sent automatically when a customer clicks one of the
                    selected buttons. Messages are sent within the 24-hour customer service window.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-slate-700 text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={onNext}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

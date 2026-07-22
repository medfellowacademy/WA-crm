'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ShoppingBag, Search, X, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  sku: string | null;
  is_active: boolean;
}

interface ProductPickerProps {
  conversationId: string;
  onClose: () => void;
  onSent: () => void;
}

export function ProductPicker({ conversationId, onClose, onSent }: ProductPickerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('products')
      .select('id, name, price, currency, image_url, sku, is_active')
      .eq('is_active', true)
      .order('name');
    setProducts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const send = async (product: Product) => {
    setSending(product.id);
    try {
      const res = await fetch('/api/whatsapp/send-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, productId: product.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to send');
      }
      const { fallback } = await res.json();
      toast.success(fallback ? 'Product sent as text (no catalog linked)' : 'Product message sent');
      onSent();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send product');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-xl w-80 max-h-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-white">Send Product</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-8 h-8 text-xs bg-slate-800 border-slate-700 text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {products.length === 0 ? 'No products in catalog yet.' : 'No matches.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800/50"
              >
                {/* Thumbnail */}
                <div className="h-10 w-10 shrink-0 rounded-md bg-slate-800 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ShoppingBag className="h-4 w-4 text-slate-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{product.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {product.price != null && (
                      <span className="text-[11px] text-green-400 font-medium">
                        {product.currency ?? 'USD'} {product.price.toLocaleString()}
                      </span>
                    )}
                    {product.sku && (
                      <Badge className="text-[9px] px-1 py-0 bg-slate-700 text-slate-400 border-0">
                        {product.sku}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Send button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-7 w-7 shrink-0 text-slate-400 hover:text-primary hover:bg-primary/10",
                  )}
                  onClick={() => send(product)}
                  disabled={!!sending}
                >
                  {sending === product.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

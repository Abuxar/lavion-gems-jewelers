'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { formatPKR } from '@/lib/cart';
import { Field, FormError, SubmitButton } from '@/components/form';

type Order = {
  id: string;
  status?: string;
  date?: string;
  items?: string;
  total?: number;
  city?: string;
  priceConfirmed?: boolean;
};

const STAGES = [
  { title: 'Order confirmed', desc: 'Received and verified' },
  { title: 'Being made', desc: 'Crafting and hallmarking' },
  { title: 'On its way', desc: 'In transit with the courier' },
  { title: 'Delivered', desc: 'Handed over' }
];

/**
 * Which of the four stages an order has reached.
 *
 * Matched against the statuses the admin panel can actually set — Pending,
 * Price Confirmed, Processing, Shipped, Delivered, Cancelled — rather than by
 * sniffing for substrings. Cancelled is not a stage at all, and the old
 * timeline had no branch for it, so a cancelled order was drawn as though it
 * were sitting happily at "Order Confirmed".
 */
function stageOf(status: string): number {
  const s = status.trim().toLowerCase();
  if (s === 'delivered' || s.includes('complete')) return 4;
  if (s === 'shipped' || s.includes('transit') || s.includes('dispatch')) return 3;
  if (s === 'processing' || s.includes('production') || s.includes('crafting')) return 2;
  return 1;
}

function isCancelled(status: string): boolean {
  return status.trim().toLowerCase().startsWith('cancel');
}

export function TrackView() {
  const { api } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const initial = params?.get('ref') || '';

  const [query, setQuery] = useState(initial);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      setBusy(true);
      setError(null);
      setOrder(null);

      const { ok, data } = await api<{ order?: Order }>(
        `/api/orders/track/${encodeURIComponent(q)}`
      );

      if (ok && data.order) setOrder(data.order);
      else setError(data.message || `We could not find an order matching “${q}”.`);
      setBusy(false);
    },
    [api]
  );

  // A reference in the URL means the link was shared or bookmarked; look it up
  // without making the customer press the button again.
  useEffect(() => {
    if (initial) void lookup(initial);
  }, [initial, lookup]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('ref');
    const value = String(q || '').trim();
    setQuery(value);
    // Put it in the URL so the result can be shared or reloaded.
    router.replace(`/track-order?ref=${encodeURIComponent(value)}`);
    void lookup(value);
  }

  const status = order?.status || 'Pending';
  const cancelled = order ? isCancelled(status) : false;
  const stage = order ? stageOf(status) : 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-serif text-4xl font-light text-ink">Track your order</h1>
      <p className="mt-3 font-sans text-sm leading-relaxed text-ink-muted">
        Enter the reference we gave you when you ordered, or the phone number you
        ordered with.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 max-w-md">
        <FormError>{error}</FormError>
        <Field
          label="Order reference or phone number"
          id="ref"
          defaultValue={query}
          placeholder="ORD-1234"
          required
        />
        <SubmitButton busy={busy}>Find my order</SubmitButton>
      </form>

      {order && (
        <section className="mt-14 border-t border-hairline pt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-serif text-2xl font-light text-ink">{order.id}</h2>
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-gold-600">
              {status}
            </p>
          </div>

          {cancelled ? (
            <p className="mt-8 border-l-2 border-red-700 bg-red-50 px-4 py-3 font-sans text-sm text-red-900">
              This order was cancelled. If that is unexpected, please contact us with
              the reference above.
            </p>
          ) : (
            <ol className="mt-10 grid gap-6 sm:grid-cols-4">
              {STAGES.map((s, i) => {
                const n = i + 1;
                const done = n <= stage;
                const current = n === stage;
                return (
                  <li key={s.title} className="text-center">
                    <div
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border font-sans text-sm ${
                        current
                          ? 'border-gold-400 bg-gold-400 text-onyx'
                          : done
                            ? 'border-gold-400 bg-canvas-pure text-gold-600'
                            : 'border-hairline bg-canvas-pure text-ink-faint'
                      }`}
                      aria-hidden="true"
                    >
                      {done ? '✓' : n}
                    </div>
                    <p
                      className={`mt-3 font-sans text-xs font-semibold ${
                        done ? 'text-ink' : 'text-ink-faint'
                      }`}
                    >
                      {s.title}
                    </p>
                    <p className="mt-1 font-sans text-[11px] leading-relaxed text-ink-faint">
                      {s.desc}
                    </p>
                    <span className="sr-only">
                      {current ? 'Current stage' : done ? 'Completed' : 'Not yet reached'}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <dl className="mt-12 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 border-t border-hairline pt-8 font-sans text-sm">
            {order.date && (
              <>
                <dt className="text-ink-faint">Placed</dt>
                <dd className="text-ink">{order.date}</dd>
              </>
            )}
            {order.items && (
              <>
                <dt className="text-ink-faint">Items</dt>
                <dd className="text-ink">{order.items}</dd>
              </>
            )}
            {typeof order.total === 'number' && order.total > 0 && (
              <>
                <dt className="text-ink-faint">
                  {order.priceConfirmed ? 'Total' : 'Indicative total'}
                </dt>
                <dd className="text-ink">
                  {formatPKR(order.total)}
                  {!order.priceConfirmed && (
                    <span className="ml-2 text-xs text-ink-faint">
                      — not yet confirmed against the day&rsquo;s gold rate
                    </span>
                  )}
                </dd>
              </>
            )}
          </dl>
        </section>
      )}
    </main>
  );
}

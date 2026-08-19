'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/lib/admin-auth';
import type { AdminOrder, AdminProduct } from '@/components/admin/panel';
import { Button, Field, Notice, Panel, Stat, money, useNotice } from '@/components/admin/ui';

type Rates = {
  rate24kPerTola?: number;
  rate24kPer10g?: number;
  rate24kPer1g?: number;
  rate22kPerTola?: number;
  rate18kPerTola?: number;
  rateSilverPerTola?: number;
  updatedAt?: string;
};

const LOW_STOCK = 5;

/**
 * The overview, and the rate the whole shop is priced against.
 *
 * The rate feed runs itself — /sync pulls international spot and the dollar
 * rate and recomputes every karat. The manual override is there for the days
 * the local Sarafa quote and international parity disagree, and it recomputes
 * the other karats from whatever 24K figure is entered so they cannot drift
 * apart from each other.
 */
export function DashboardTab({
  products,
  orders
}: {
  products: AdminProduct[];
  orders: AdminOrder[];
}) {
  const { api } = useAdmin();
  const { notice, say, clear } = useNotice();

  const [rates, setRates] = useState<Rates | null>(null);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState<'sync' | 'save' | null>(null);

  const load = useCallback(async () => {
    const { ok, data } = await api<{ goldRates?: Rates }>('/api/gold-rates');
    if (ok && data.goldRates) setRates(data.goldRates);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sync() {
    setBusy('sync');
    const { ok, data } = await api<{ goldRates?: Rates }>('/api/gold-rates/sync', {
      method: 'POST'
    });
    setBusy(null);
    if (ok && data.goldRates) setRates(data.goldRates);
    say(ok, data.message || (ok ? 'Rates synced.' : 'The rate feeds are unreachable.'));
  }

  async function saveManual() {
    const value = Number(manual);
    if (!Number.isFinite(value) || value <= 0) {
      say(false, 'Enter the 24K rate per tola, in rupees.');
      return;
    }
    setBusy('save');
    const { ok, data } = await api<{ goldRates?: Rates }>('/api/gold-rates', {
      method: 'PUT',
      body: JSON.stringify({ rate24kPerTola: value })
    });
    setBusy(null);
    if (ok && data.goldRates) {
      setRates(data.goldRates);
      setManual('');
    }
    say(ok, data.message || (ok ? 'Rates updated.' : 'The server refused the figure.'));
  }

  const lowStock = products.filter(p => p.stock < LOW_STOCK).length;
  const active = orders.filter(
    o => !['delivered', 'cancelled'].includes((o.status || '').trim().toLowerCase())
  ).length;
  // Only orders whose price has actually been agreed. Counting the rest would
  // add up indicative figures the shop has not committed to and call it revenue.
  const settled = orders
    .filter(o => o.priceConfirmed && (o.status || '').toLowerCase() !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const row = (label: string, value?: number) =>
    value ? (
      <div className="flex justify-between border-b border-white/5 py-2 text-sm last:border-0">
        <span className="text-canvas/50">{label}</span>
        <span className="font-medium text-canvas">{money(value)}</span>
      </div>
    ) : null;

  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pieces in catalogue" value={String(products.length)} />
        <Stat
          label={`Low stock (under ${LOW_STOCK})`}
          value={String(lowStock)}
          tone={lowStock > 0 ? 'warn' : undefined}
        />
        <Stat label="Orders still moving" value={String(active)} tone="good" />
        <Stat label="Agreed order value" value={money(settled)} />
      </div>

      <Panel
        title="Today's gold rate"
        description="Pulled from international spot and the dollar rate, and recomputed for each karat. This is the figure the ticker shows and the whole catalogue is quoted against."
      >
        {rates ? (
          <div className="max-w-md">
            {row('24K per tola', rates.rate24kPerTola)}
            {row('24K per 10g', rates.rate24kPer10g)}
            {row('24K per 1g', rates.rate24kPer1g)}
            {row('22K per tola', rates.rate22kPerTola)}
            {row('18K per tola', rates.rate18kPerTola)}
            {row('Silver per tola', rates.rateSilverPerTola)}
            {rates.updatedAt && (
              <p className="mt-3 text-[11px] text-canvas/35">
                Last written {new Date(rates.updatedAt).toLocaleString('en-GB')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-canvas/40">Loading the rate table…</p>
        )}

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <Button kind="primary" disabled={busy !== null} onClick={sync}>
            {busy === 'sync' ? 'Syncing…' : 'Sync from the market'}
          </Button>

          <div className="w-56">
            <Field
              label="Or set 24K / tola"
              type="number"
              min={1}
              placeholder="e.g. 470000"
              value={manual}
              onChange={e => setManual(e.target.value)}
              hint="Every other karat is recomputed from this."
            />
          </div>
          <Button disabled={busy !== null || manual === ''} onClick={saveManual}>
            {busy === 'save' ? 'Saving…' : 'Override'}
          </Button>
        </div>

        <Notice notice={notice} onDone={clear} />
      </Panel>
    </>
  );
}

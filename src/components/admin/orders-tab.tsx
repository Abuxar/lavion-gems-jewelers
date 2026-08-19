'use client';

import { useMemo, useState } from 'react';
import { useAdmin } from '@/lib/admin-auth';
import type { AdminOrder } from '@/components/admin/panel';
import {
  Button,
  Cell,
  Field,
  Notice,
  Panel,
  Row,
  Select,
  Table,
  money,
  useNotice
} from '@/components/admin/ui';

/**
 * Customer orders: follow them, price them, move them along.
 *
 * The statuses are the ones the tracking timeline reads, so anything set here
 * shows up correctly on the customer's page. Cancelled is one of them and is
 * drawn as an end state rather than a stage.
 */
const STATUSES = [
  'Pending',
  'Price Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled'
];

/** An order still moving. Delivered and Cancelled are both finished. */
const isActive = (s: string) =>
  !['delivered', 'cancelled'].includes(s.trim().toLowerCase());

export function OrdersTab({
  orders,
  onChanged
}: {
  orders: AdminOrder[];
  onChanged: () => Promise<void>;
}) {
  const { api } = useAdmin();
  const { notice, say, clear } = useNotice();

  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [pricing, setPricing] = useState<{ order: AdminOrder; value: string } | null>(null);

  const shown = useMemo(
    () => (filter ? orders.filter(o => (o.status || '') === filter) : orders),
    [orders, filter]
  );

  async function setStatus(order: AdminOrder, status: string) {
    setBusy(order.id);
    const { ok, data } = await api(`/api/orders/${encodeURIComponent(order.id)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    setBusy(null);
    if (ok) {
      await onChanged();
      say(true, `${order.id} is now ${status}.`);
    } else {
      say(false, data.message || 'The server refused the change.');
    }
  }

  async function confirmPrice() {
    if (!pricing) return;
    const value = Number(pricing.value);
    if (!Number.isFinite(value) || value <= 0) {
      say(false, 'Enter the agreed figure in rupees.');
      return;
    }

    setBusy(pricing.order.id);
    const { ok, data } = await api(`/api/orders/${encodeURIComponent(pricing.order.id)}/price`, {
      method: 'PUT',
      // Setting the figure is what confirms it, so the status moves with it —
      // otherwise the customer sees a confirmed total still labelled indicative.
      body: JSON.stringify({ price: value, status: 'Price Confirmed' })
    });
    setBusy(null);
    if (ok) {
      setPricing(null);
      await onChanged();
      say(true, `${pricing.order.id} agreed at ${money(value)}.`);
    } else {
      say(false, data.message || 'The server refused the price.');
    }
  }

  const active = orders.filter(o => isActive(o.status || '')).length;

  return (
    <>
      <Panel
        title="Orders"
        description={`${orders.length} in total, ${active} still moving. The customer sees the status you set here on the tracking page.`}
      >
        <div className="mb-5 max-w-xs">
          <Select label="Status" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <Table
          head={['Reference', 'Customer', 'Items', 'Total', 'Status', '']}
          empty={orders.length === 0 ? 'No orders yet.' : 'Nothing with that status.'}
        >
          {shown.map(o => (
            <Row key={o.id}>
              <Cell>
                <div className="font-medium text-canvas">{o.id}</div>
                <div className="text-[11px] text-canvas/40">{o.date}</div>
              </Cell>
              <Cell>
                <div className="text-canvas/80">{o.customer}</div>
                <div className="text-[11px] text-canvas/40">
                  {o.phone}
                  {o.city ? ` · ${o.city}` : ''}
                </div>
              </Cell>
              <Cell className="max-w-[18rem] text-canvas/70">{o.items}</Cell>
              <Cell>
                {o.total > 0 ? (
                  <>
                    <div className="text-canvas/80">{money(o.total)}</div>
                    {!o.priceConfirmed && (
                      <div className="text-[11px] text-gold-300">not yet agreed</div>
                    )}
                  </>
                ) : (
                  <span className="text-[11px] text-gold-300">to be quoted</span>
                )}
              </Cell>
              <Cell>
                <select
                  aria-label={`Status of ${o.id}`}
                  value={o.status || 'Pending'}
                  disabled={busy === o.id}
                  onChange={e => setStatus(o, e.target.value)}
                  className="border border-white/15 bg-onyx px-2 py-1 text-xs text-canvas focus:border-gold-400 focus:outline-none disabled:opacity-50"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Cell>
              <Cell className="whitespace-nowrap">
                <Button
                  onClick={() =>
                    setPricing({ order: o, value: o.total > 0 ? String(o.total) : '' })
                  }
                >
                  Set price
                </Button>
              </Cell>
            </Row>
          ))}
        </Table>

        <Notice notice={notice} onDone={clear} />
      </Panel>

      {pricing && (
        <Panel
          title={`Agreed price for ${pricing.order.id}`}
          description="This is the figure the customer sees as their total, and it marks the order as priced against today's rate."
        >
          <div className="flex max-w-md items-end gap-3">
            <div className="flex-1">
              <Field
                label="Agreed price (PKR)"
                type="number"
                min={1}
                autoFocus
                value={pricing.value}
                onChange={e => setPricing({ ...pricing, value: e.target.value })}
              />
            </div>
            <Button
              kind="primary"
              disabled={busy === pricing.order.id}
              onClick={confirmPrice}
            >
              {busy === pricing.order.id ? 'Saving…' : 'Confirm'}
            </Button>
            <Button onClick={() => setPricing(null)}>Cancel</Button>
          </div>
        </Panel>
      )}
    </>
  );
}

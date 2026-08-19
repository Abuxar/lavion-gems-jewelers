'use client';

import { useMemo, useState } from 'react';
import { useAdmin } from '@/lib/admin-auth';
import type { AdminProduct } from '@/components/admin/panel';
import {
  Button,
  Cell,
  Notice,
  Panel,
  Row,
  Select,
  Table,
  useNotice
} from '@/components/admin/ui';

const LOW_STOCK = 5;

/**
 * Stock, editable in place.
 *
 * The catalogue tab can change stock too, but through the whole edit form. This
 * is the view for the job that actually happens often — walking the shelf and
 * correcting counts — so the number is editable where it is displayed and each
 * row saves on its own.
 */
export function StockTab({
  products,
  onChanged
}: {
  products: AdminProduct[];
  onChanged: () => Promise<void>;
}) {
  const { api } = useAdmin();
  const { notice, say, clear } = useNotice();

  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  // Only rows the user has actually touched, so a reload underneath does not
  // overwrite a number someone is halfway through typing.
  const [edits, setEdits] = useState<Record<string, string>>({});

  const shown = useMemo(() => {
    if (filter === 'low') return products.filter(p => p.stock > 0 && p.stock < LOW_STOCK);
    if (filter === 'out') return products.filter(p => p.stock <= 0);
    if (filter === 'in') return products.filter(p => p.stock >= LOW_STOCK);
    return products;
  }, [products, filter]);

  async function save(p: AdminProduct) {
    const raw = edits[p.id];
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      say(false, 'Stock has to be a whole number, zero or more.');
      return;
    }

    setBusy(p.id);
    const { ok, data } = await api(`/api/products/${encodeURIComponent(p.id)}`, {
      method: 'PUT',
      body: JSON.stringify({ stock: value })
    });
    setBusy(null);

    if (ok) {
      setEdits(rest => {
        const next = { ...rest };
        delete next[p.id];
        return next;
      });
      await onChanged();
      say(true, `${p.name}: ${value} in stock.`);
    } else {
      say(false, data.message || 'The server refused the change.');
    }
  }

  return (
    <Panel
      title="Stock"
      description={`Anything under ${LOW_STOCK} is flagged. A piece at zero still has a page — it shows as out of stock and cannot be added to a bag.`}
    >
      <div className="mb-5 max-w-xs">
        <Select label="Show" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">Everything</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
          <option value="in">Well stocked</option>
        </Select>
      </div>

      <Table
        head={['Piece', 'Collection', 'In stock', 'New count', '']}
        empty={products.length === 0 ? 'The catalogue is empty.' : 'Nothing in that band.'}
      >
        {shown.map(p => {
          const pending = edits[p.id];
          const changed = pending !== undefined && pending !== String(p.stock);
          return (
            <Row key={p.id}>
              <Cell className="text-canvas/85">{p.name}</Cell>
              <Cell className="text-canvas/50">{p.category}</Cell>
              <Cell>
                <span
                  className={
                    p.stock <= 0
                      ? 'text-red-400'
                      : p.stock < LOW_STOCK
                        ? 'text-gold-300'
                        : 'text-emerald-400'
                  }
                >
                  {p.stock <= 0 ? 'Out of stock' : p.stock}
                </span>
              </Cell>
              <Cell>
                <input
                  type="number"
                  min={0}
                  aria-label={`New stock count for ${p.name}`}
                  value={pending ?? String(p.stock)}
                  onChange={e => setEdits({ ...edits, [p.id]: e.target.value })}
                  className="w-24 border border-white/15 bg-onyx px-2 py-1 text-sm text-canvas focus:border-gold-400 focus:outline-none"
                />
              </Cell>
              <Cell>
                <Button disabled={!changed || busy === p.id} onClick={() => save(p)}>
                  {busy === p.id ? 'Saving…' : 'Save'}
                </Button>
              </Cell>
            </Row>
          );
        })}
      </Table>

      <Notice notice={notice} onDone={clear} />
    </Panel>
  );
}

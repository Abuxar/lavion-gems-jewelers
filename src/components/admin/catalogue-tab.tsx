'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { useAdmin } from '@/lib/admin-auth';
import type { AdminProduct } from '@/components/admin/panel';
import {
  Button,
  Cell,
  Field,
  Notice,
  Panel,
  Row,
  Select,
  Table,
  TextArea,
  money,
  useNotice
} from '@/components/admin/ui';

/**
 * The catalogue: add, edit and remove pieces.
 *
 * Every change goes to the server first and the local list is updated from what
 * comes back. The old panel wrote to localStorage and posted afterwards, so a
 * refused save still looked like it had worked — until the next page load,
 * where syncBackendData() overwrote the key from /api/products and the change
 * silently vanished.
 */

const BLANK = {
  id: '',
  name: '',
  category: CATEGORIES[0].key,
  price: 0,
  stock: 0,
  badge: '',
  img: '',
  desc: ''
};

export function CatalogueTab({
  products,
  onChanged
}: {
  products: AdminProduct[];
  onChanged: () => Promise<void>;
}) {
  const { api } = useAdmin();
  const { notice, say, clear } = useNotice();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<typeof BLANK | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<AdminProduct | null>(null);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      p =>
        (!q || p.name.toLowerCase().includes(q)) &&
        (!filter || p.category.toLowerCase() === filter)
    );
  }, [products, search, filter]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);

    const isNew = !editing.id;
    const { ok, data } = await api(
      isNew ? '/api/products' : `/api/products/${encodeURIComponent(editing.id)}`,
      {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify({
          name: editing.name,
          category: editing.category,
          price: editing.price,
          stock: editing.stock,
          badge: editing.badge,
          // Left blank, the server fills in its own default rather than
          // storing an empty string that renders as a broken image.
          ...(editing.img ? { img: editing.img } : {}),
          desc: editing.desc
        })
      }
    );

    setBusy(false);
    if (ok) {
      setEditing(null);
      await onChanged();
      say(true, isNew ? `${editing.name} added.` : `${editing.name} saved.`);
    } else {
      say(false, data.message || 'The server refused the change.');
    }
  }

  async function remove(p: AdminProduct) {
    setBusy(true);
    const { ok, data } = await api(`/api/products/${encodeURIComponent(p.id)}`, {
      method: 'DELETE'
    });
    setBusy(false);
    setConfirming(null);
    if (ok) {
      await onChanged();
      say(true, `${p.name} removed.`);
    } else {
      say(false, data.message || 'The server refused the deletion.');
    }
  }

  return (
    <>
      <Panel title="Catalogue" description={`${products.length} pieces in the shop.`}>
        <div className="mb-5 flex flex-wrap items-end gap-4">
          <div className="min-w-[16rem] flex-1">
            <Field
              label="Search"
              placeholder="By name"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-[12rem]">
            <Select
              label="Collection"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="">All collections</option>
              {CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <Button kind="primary" onClick={() => setEditing({ ...BLANK })}>
            Add a piece
          </Button>
        </div>

        <Table
          head={['Piece', 'Collection', 'Price', 'Stock', '']}
          empty={
            products.length === 0
              ? 'The catalogue is empty.'
              : 'Nothing matches that search.'
          }
        >
          {shown.map(p => (
            <Row key={p.id}>
              <Cell>
                <div className="font-medium text-canvas">{p.name}</div>
                <div className="text-[11px] text-canvas/40">ref {p.id}</div>
              </Cell>
              <Cell className="text-canvas/70">{p.category}</Cell>
              <Cell className="text-canvas/70">{p.price > 0 ? money(p.price) : '—'}</Cell>
              <Cell className={p.stock <= 0 ? 'text-red-400' : 'text-canvas/70'}>
                {p.stock}
              </Cell>
              <Cell className="whitespace-nowrap">
                <Button onClick={() => setEditing({ ...BLANK, ...p })}>Edit</Button>{' '}
                <Button kind="danger" onClick={() => setConfirming(p)}>
                  Remove
                </Button>
              </Cell>
            </Row>
          ))}
        </Table>

        <Notice notice={notice} onDone={clear} />
      </Panel>

      {editing && (
        <Panel title={editing.id ? `Editing ${editing.name}` : 'A new piece'}>
          <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              required
              value={editing.name}
              onChange={e => setEditing({ ...editing, name: e.target.value })}
            />
            <Select
              label="Collection"
              value={editing.category}
              onChange={e => setEditing({ ...editing, category: e.target.value })}
            >
              {CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Field
              label="Price (PKR)"
              type="number"
              min={0}
              value={editing.price}
              onChange={e => setEditing({ ...editing, price: Number(e.target.value) })}
              hint="Zero means the piece is quoted rather than listed."
            />
            <Field
              label="Stock"
              type="number"
              min={0}
              value={editing.stock}
              onChange={e => setEditing({ ...editing, stock: Number(e.target.value) })}
            />
            <Field
              label="Badge"
              value={editing.badge}
              onChange={e => setEditing({ ...editing, badge: e.target.value })}
              hint="Shown on the card, e.g. New. Leave blank for none."
            />
            <Field
              label="Image path"
              value={editing.img}
              onChange={e => setEditing({ ...editing, img: e.target.value })}
              hint="e.g. images/featured_rings.png"
            />
            <div className="sm:col-span-2">
              <TextArea
                label="Description"
                rows={3}
                value={editing.desc}
                onChange={e => setEditing({ ...editing, desc: e.target.value })}
              />
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <Button kind="primary" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
              <Button onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        </Panel>
      )}

      {confirming && (
        <Panel title="Remove this piece?">
          <p className="text-sm text-canvas/70">
            <strong className="text-canvas">{confirming.name}</strong> will be
            removed from the catalogue. Anyone holding a link to its page will
            get a 404.
          </p>
          <div className="mt-4 flex gap-3">
            <Button kind="danger" disabled={busy} onClick={() => remove(confirming)}>
              {busy ? 'Removing…' : 'Remove it'}
            </Button>
            <Button onClick={() => setConfirming(null)}>Keep it</Button>
          </div>
        </Panel>
      )}
    </>
  );
}

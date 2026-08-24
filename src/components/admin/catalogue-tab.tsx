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

/**
 * A piece, as the form holds it.
 *
 * The specification fields are all strings here even where they are numbers in
 * the database. A number input bound to a number cannot be emptied — clearing
 * it yields NaN or snaps back to 0, and 0 g is a claim about the piece rather
 * than an absence. Kept as text, blank stays blank all the way to the server,
 * which stores null.
 */
const BLANK = {
  id: '',
  name: '',
  category: CATEGORIES[0].key,
  price: 0,
  stock: 0,
  badge: '',
  img: '',
  desc: '',

  metal: '',
  purity: '',
  grossWeightG: '',
  stone: '',
  stoneCarats: '',
  stoneCount: '',
  stoneQuality: '',
  certificate: '',
  dimensions: '',
  sizes: '',
  images: '',
  madeToOrderDays: '',
  details: '',
  care: ''
};

/**
 * A stored piece, as the edit form wants it.
 *
 * Spreading the product straight onto BLANK looked right and was not: a number
 * arrives as a number or null and a size list arrives as an array, none of
 * which a text input can hold — and a piece whose specification had never been
 * filled in would have had every one of those keys missing, so the form would
 * have posted BLANK's empty strings back and wiped nothing, while a piece that
 * DID have a specification would have had its arrays stringified as
 * "12,14,16" only by luck of Array.prototype.toString.
 */
function toForm(p: AdminProduct): typeof BLANK {
  const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  const csv = (v: unknown) => (Array.isArray(v) ? v.join(', ') : str(v));

  return {
    ...BLANK,
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    stock: p.stock,
    badge: p.badge ?? '',
    img: p.img ?? '',
    desc: p.desc ?? '',

    metal: str(p.metal),
    purity: str(p.purity),
    grossWeightG: str(p.grossWeightG),
    stone: str(p.stone),
    stoneCarats: str(p.stoneCarats),
    stoneCount: str(p.stoneCount),
    stoneQuality: str(p.stoneQuality),
    certificate: str(p.certificate),
    dimensions: str(p.dimensions),
    sizes: csv(p.sizes),
    images: csv(p.images),
    madeToOrderDays: str(p.madeToOrderDays),
    details: str(p.details),
    care: str(p.care)
  };
}

/** Everything the specification form owns, in the order it is shown. */
const SPEC_FIELDS = [
  'metal', 'purity', 'grossWeightG', 'stone', 'stoneCarats', 'stoneCount',
  'stoneQuality', 'certificate', 'dimensions', 'sizes', 'images',
  'madeToOrderDays', 'details', 'care'
] as const;

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
          desc: editing.desc,
          // Sent even when blank, because blank is how a field gets cleared.
          // The server reads absent as "not part of this edit", which is what
          // lets the stock tab post { stock } without wiping the piece.
          ...Object.fromEntries(SPEC_FIELDS.map(k => [k, editing[k]]))
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
                <Button onClick={() => setEditing(toForm(p))}>Edit</Button>{' '}
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
                hint="One line, shown on the card and under the name."
              />
            </div>

            {/*
              The specification.

              All optional, and the product page drops whatever is left blank —
              so a piece nobody has filled in reads exactly as it does today
              rather than showing a column of empty labels.
            */}
            <div className="border-t border-white/10 pt-5 sm:col-span-2">
              <h3 className="font-sans text-[11px] font-bold tracking-[0.14em] text-gold-300 uppercase">
                Specification
              </h3>
              <p className="mt-1 text-xs text-canvas/45">
                Everything here is optional. Anything left blank is simply not shown on the
                piece&rsquo;s page.
              </p>
            </div>

            <Field
              label="Metal"
              value={editing.metal}
              onChange={e => setEditing({ ...editing, metal: e.target.value })}
              hint="e.g. 22K Yellow Gold"
            />
            <Field
              label="Hallmark"
              value={editing.purity}
              onChange={e => setEditing({ ...editing, purity: e.target.value })}
              hint="As struck: 916, 750, PT950"
            />
            <Field
              label="Gross weight (g)"
              type="number"
              min={0}
              step="0.01"
              value={editing.grossWeightG}
              onChange={e => setEditing({ ...editing, grossWeightG: e.target.value })}
              hint="Finished weight, stones included."
            />
            <Field
              label="Stone"
              value={editing.stone}
              onChange={e => setEditing({ ...editing, stone: e.target.value })}
              hint="e.g. Colombian Emerald"
            />
            <Field
              label="Carat weight (total)"
              type="number"
              min={0}
              step="0.01"
              value={editing.stoneCarats}
              onChange={e => setEditing({ ...editing, stoneCarats: e.target.value })}
            />
            <Field
              label="Stones set"
              type="number"
              min={0}
              value={editing.stoneCount}
              onChange={e => setEditing({ ...editing, stoneCount: e.target.value })}
            />
            <Field
              label="Quality"
              value={editing.stoneQuality}
              onChange={e => setEditing({ ...editing, stoneQuality: e.target.value })}
              hint="Colour and clarity, e.g. G–H / VS"
            />
            <Field
              label="Certificate"
              value={editing.certificate}
              onChange={e => setEditing({ ...editing, certificate: e.target.value })}
              hint="Body and number, e.g. GIA 2185746321"
            />
            <Field
              label="Dimensions"
              value={editing.dimensions}
              onChange={e => setEditing({ ...editing, dimensions: e.target.value })}
              hint="e.g. Band 2.4 mm"
            />
            <Field
              label="Ready in (working days)"
              type="number"
              min={0}
              value={editing.madeToOrderDays}
              onChange={e => setEditing({ ...editing, madeToOrderDays: e.target.value })}
              hint="For a made-to-order piece."
            />
            <Field
              label="Sizes made"
              value={editing.sizes}
              onChange={e => setEditing({ ...editing, sizes: e.target.value })}
              hint="Comma separated, e.g. 12, 14, 16"
            />
            <Field
              label="Further images"
              value={editing.images}
              onChange={e => setEditing({ ...editing, images: e.target.value })}
              hint="Comma separated paths. The main image stays above."
            />
            <div className="sm:col-span-2">
              <TextArea
                label="About this piece"
                rows={5}
                value={editing.details}
                onChange={e => setEditing({ ...editing, details: e.target.value })}
                hint="Full sentences. Leave a blank line between paragraphs."
              />
            </div>
            <div className="sm:col-span-2">
              <TextArea
                label="Care"
                rows={2}
                value={editing.care}
                onChange={e => setEditing({ ...editing, care: e.target.value })}
                hint="e.g. Avoid perfume and chlorine; polish with a soft cloth."
              />
            </div>

            <div className="flex gap-3 border-t border-white/10 pt-5 sm:col-span-2">
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

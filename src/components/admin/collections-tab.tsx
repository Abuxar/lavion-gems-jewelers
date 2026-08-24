'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/lib/admin-auth';
import type { AdminProduct } from '@/components/admin/panel';
import { Button, Cell, Field, Notice, Panel, Row, Table, useNotice } from '@/components/admin/ui';

type Collection = {
  slug: string;
  name: string;
  description?: string;
};

/**
 * Collections the shop has made up.
 *
 * Creating one from inside the product form is convenient and not enough:
 * there was nowhere to see what exists, rename one, give it a description, or
 * remove it. This is that place.
 *
 * The eight the site ships with are not listed here. They are hardcoded — one
 * route each, their own copy, their own indexed URLs — and offering a Rename
 * button beside something a rename cannot reach would be a lie.
 */
export function CollectionsTab({ products }: { products: AdminProduct[] }) {
  const { api } = useAdmin();
  const { notice, say, clear } = useNotice();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { name: string; description: string }>>({});
  const [creating, setCreating] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<{ slug: string; name: string; inUse: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await api<{ categories?: Collection[] }>('/api/categories');
    if (ok && Array.isArray(data.categories)) {
      setCollections(data.categories);
      setDrafts({});
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const countIn = (slug: string) =>
    products.filter(
      p => p.category === slug || (p.categories || []).includes(slug)
    ).length;

  const draftFor = (c: Collection) =>
    drafts[c.slug] ?? { name: c.name, description: c.description || '' };

  const setDraft = (slug: string, patch: Partial<{ name: string; description: string }>) =>
    setDrafts(d => ({
      ...d,
      [slug]: { ...(d[slug] ?? { name: '', description: '' }), ...patch }
    }));

  async function create() {
    const name = creating.trim();
    if (!name) {
      say(false, 'Give the collection a name first.');
      return;
    }
    setBusy('new');
    const { ok, data } = await api<{ message?: string }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    setBusy(null);
    if (ok) {
      setCreating('');
      await load();
      say(true, data.message || `Collection "${name}" created.`);
    } else {
      say(false, data.message || 'The collection could not be created.');
    }
  }

  async function save(c: Collection) {
    const draft = draftFor(c);
    if (!draft.name.trim()) {
      say(false, 'A collection needs a name.');
      return;
    }
    setBusy(c.slug);
    const { ok, data } = await api<{ message?: string }>(
      `/api/categories/${encodeURIComponent(c.slug)}`,
      { method: 'PUT', body: JSON.stringify({ name: draft.name.trim(), description: draft.description.trim() }) }
    );
    setBusy(null);
    if (ok) {
      await load();
      say(true, `${draft.name.trim()} saved.`);
    } else {
      say(false, data.message || 'The server refused the change.');
    }
  }

  /**
   * Removing one is refused while pieces are still filed under it, unless the
   * admin confirms. Those pieces stay in the catalogue but drop out of every
   * listing that used this collection — a disappearance nobody thinks to look
   * for, so it is named before it happens.
   */
  async function remove(c: Collection, force = false) {
    setBusy(c.slug);
    const { ok, status, data } = await api<{ message?: string; inUse?: number }>(
      `/api/categories/${encodeURIComponent(c.slug)}${force ? '?force=1' : ''}`,
      { method: 'DELETE' }
    );
    setBusy(null);

    if (status === 409 && data.inUse) {
      setConfirming({ slug: c.slug, name: c.name, inUse: data.inUse });
      return;
    }
    if (ok) {
      setConfirming(null);
      await load();
      say(true, `${c.name} removed.`);
    } else {
      say(false, data.message || 'The collection could not be removed.');
    }
  }

  return (
    <>
      <Panel
        title="Your collections"
        description="Beyond the eight the site ships with, which are part of the build and are not listed here. Each one made here gets a page at /collection/<name>. Put pieces in one from the piece's own form, under “Also appears in”."
      >
        <div className="mb-6 flex flex-wrap gap-3">
          <input
            value={creating}
            onChange={e => setCreating(e.target.value)}
            placeholder="New collection, e.g. Bridal"
            className="min-w-0 flex-1 border border-white/15 bg-onyx px-3 py-2 text-sm text-canvas placeholder:text-canvas/25 focus:border-gold-400 focus:outline-none sm:max-w-xs"
          />
          <Button kind="primary" onClick={() => void create()} disabled={busy === 'new'}>
            {busy === 'new' ? 'Creating…' : 'Create collection'}
          </Button>
        </div>

        <Table
          head={['Name', 'Description', 'Address', 'Pieces', '']}
          empty={
            loading
              ? 'Loading…'
              : 'No collections of your own yet. The eight the site ships with are always there.'
          }
        >
          {collections.map(c => {
            const draft = draftFor(c);
            const dirty = draft.name !== c.name || draft.description !== (c.description || '');
            return (
              <Row key={c.slug}>
                <Cell>
                  <Field
                    label=""
                    aria-label={`Name of ${c.name}`}
                    value={draft.name}
                    onChange={e => setDraft(c.slug, { name: e.target.value })}
                  />
                </Cell>
                <Cell>
                  <Field
                    label=""
                    aria-label={`Description of ${c.name}`}
                    placeholder="Optional"
                    value={draft.description}
                    onChange={e => setDraft(c.slug, { description: e.target.value })}
                  />
                </Cell>
                <Cell>
                  <a
                    href={`/collection/${c.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gold-300 hover:underline"
                  >
                    /collection/{c.slug}
                  </a>
                </Cell>
                <Cell className="text-center text-canvas/70">{countIn(c.slug)}</Cell>
                <Cell className="text-right whitespace-nowrap">
                  <Button disabled={!dirty || busy === c.slug} onClick={() => void save(c)}>
                    {busy === c.slug ? 'Saving…' : 'Save'}
                  </Button>{' '}
                  <Button kind="danger" onClick={() => void remove(c)}>
                    Remove
                  </Button>
                </Cell>
              </Row>
            );
          })}
        </Table>

        <Notice notice={notice} onDone={clear} />
      </Panel>

      {confirming && (
        <Panel title="Remove this collection?">
          <p className="text-sm text-canvas/70">
            <strong className="text-canvas">{confirming.inUse}</strong>{' '}
            {confirming.inUse === 1 ? 'piece is' : 'pieces are'} still filed under{' '}
            <strong className="text-canvas">{confirming.name}</strong>. They stay in the catalogue,
            but they will no longer appear in this collection and its page will stop resolving.
          </p>
          <div className="mt-5 flex gap-3">
            <Button
              kind="danger"
              onClick={() =>
                void remove({ slug: confirming.slug, name: confirming.name }, true)
              }
            >
              Remove it anyway
            </Button>
            <Button onClick={() => setConfirming(null)}>Keep it</Button>
          </div>
        </Panel>
      )}
    </>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/lib/admin-auth';
import {
  Button,
  Cell,
  Field,
  Notice,
  Panel,
  Row,
  Stat,
  Table,
  TextArea,
  useNotice
} from '@/components/admin/ui';

type Subscriber = {
  email: string;
  status: string;
  source?: string;
  subscribedAt?: string;
  lastCampaignAt?: string;
};

/**
 * Subscribers, and the promotion that goes out to them.
 *
 * Sending is the most irreversible thing in this panel — a campaign cannot be
 * recalled — so it asks before it sends and the test send is put first, in the
 * primary position, with the real send behind a confirmation.
 */
export function NewsletterTab() {
  const { api } = useAdmin();
  const { notice, say, clear } = useNotice();

  const [rows, setRows] = useState<Subscriber[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [draft, setDraft] = useState({
    subject: '',
    heading: '',
    body: '',
    ctaLabel: '',
    ctaUrl: ''
  });
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await api<{
      subscribers?: Subscriber[];
      total?: number;
      active?: number;
      unsubscribed?: number;
    }>('/api/subscribe/list');
    if (ok) {
      setRows(data.subscribers || []);
      setCounts({
        total: data.total || 0,
        active: data.active || 0,
        unsubscribed: data.unsubscribed || 0
      });
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter(r => r.email.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  async function send(test: boolean) {
    setSending(true);
    setConfirming(false);
    const { ok, data } = await api('/api/subscribe/campaign', {
      method: 'POST',
      body: JSON.stringify({ ...draft, test })
    });
    setSending(false);
    say(ok && data.success !== false, data.message || (ok ? 'Sent.' : 'The send failed.'));
    if (ok && !test) await load();
  }

  const ready = draft.subject.trim() !== '' && draft.body.trim() !== '';

  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Active" value={String(counts.active)} tone="good" />
        <Stat label="Unsubscribed" value={String(counts.unsubscribed)} tone="warn" />
        <Stat label="Ever subscribed" value={String(counts.total)} />
      </div>

      <Panel
        title="Compose a promotion"
        description="Sent individually, so nobody sees anyone else's address, and each message carries its own unsubscribe link. Send yourself the test first — a promotion cannot be recalled."
      >
        <div className="grid max-w-3xl gap-4">
          <Field
            label="Subject"
            maxLength={150}
            value={draft.subject}
            onChange={e => setDraft({ ...draft, subject: e.target.value })}
            placeholder="Our new bridal collection has arrived"
          />
          <Field
            label="Headline"
            maxLength={150}
            value={draft.heading}
            onChange={e => setDraft({ ...draft, heading: e.target.value })}
            hint="Shown at the top of the email. Blank reuses the subject."
          />
          <TextArea
            label="Message"
            rows={8}
            value={draft.body}
            onChange={e => setDraft({ ...draft, body: e.target.value })}
            hint="Plain text. Leave a blank line between paragraphs."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Button label"
              maxLength={40}
              value={draft.ctaLabel}
              onChange={e => setDraft({ ...draft, ctaLabel: e.target.value })}
              hint="Optional."
            />
            <Field
              label="Button link"
              type="url"
              value={draft.ctaUrl}
              onChange={e => setDraft({ ...draft, ctaUrl: e.target.value })}
              placeholder="https://jewels.lavion.co.uk/collections"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button kind="primary" disabled={!ready || sending} onClick={() => send(true)}>
              {sending ? 'Sending…' : 'Send the test to myself'}
            </Button>
            <Button
              kind="danger"
              disabled={!ready || sending || counts.active === 0}
              onClick={() => setConfirming(true)}
            >
              Send to all {counts.active} subscribers
            </Button>
          </div>

          {confirming && (
            <div className="border border-red-500/40 bg-red-500/5 p-4">
              <p className="text-sm text-canvas/80">
                This sends <strong className="text-canvas">{draft.subject}</strong> to{' '}
                <strong className="text-canvas">{counts.active}</strong> people. It
                cannot be undone or recalled.
              </p>
              <div className="mt-3 flex gap-3">
                <Button kind="danger" disabled={sending} onClick={() => send(false)}>
                  {sending ? 'Sending…' : 'Send it now'}
                </Button>
                <Button onClick={() => setConfirming(false)}>Not yet</Button>
              </div>
            </div>
          )}

          <Notice notice={notice} onDone={clear} />
        </div>
      </Panel>

      <Panel title="Subscribers">
        <div className="mb-5 max-w-sm">
          <Field
            label="Search"
            placeholder="By email"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Table
          head={['Email', 'Status', 'Source', 'Joined', 'Last sent']}
          empty={loading ? 'Loading…' : rows.length === 0 ? 'Nobody yet.' : 'No match.'}
        >
          {shown.map(s => (
            <Row key={s.email}>
              <Cell className="text-canvas/85">{s.email}</Cell>
              <Cell
                className={s.status === 'active' ? 'text-emerald-400' : 'text-canvas/40'}
              >
                {s.status}
              </Cell>
              <Cell className="text-canvas/50">{s.source || '—'}</Cell>
              <Cell className="text-canvas/50">
                {s.subscribedAt ? new Date(s.subscribedAt).toLocaleDateString('en-GB') : '—'}
              </Cell>
              <Cell className="text-canvas/50">
                {s.lastCampaignAt
                  ? new Date(s.lastCampaignAt).toLocaleDateString('en-GB')
                  : 'never'}
              </Cell>
            </Row>
          ))}
        </Table>
      </Panel>
    </>
  );
}

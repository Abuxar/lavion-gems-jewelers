'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/lib/admin-auth';
import { Button, Cell, Field, Notice, Panel, Row, Table, useNotice } from '@/components/admin/ui';

/* ------------------------------------------------------------------ *
 * What the server sends
 * ------------------------------------------------------------------ */

type Money = { usd: number; local: Record<string, number | null>; source: string };
type Band = { label: string; from: number; to: number | null } & Money;

type StoneMarket = {
  fx: {
    usdPkr: number | null;
    usdGbp: number | null;
    usdEur: number | null;
    pkrPremiumPercent: number;
    asOf: string | null;
    isSpot: boolean;
  };
  review: {
    revisedOn: string | null;
    daysSince: number | null;
    staleAfterDays: number;
    stale: boolean;
  };
  diamond: {
    natural: Band[];
    labGrown: Band[];
    labGrownFactor: number | null;
    melee: Money | null;
    setting: Money | null;
  };
  gems: ({ name: string } & Money)[];
  anchor: { source: string; label: string; note: string };
};

type Card = {
  diamondTiersUsd: { upTo: number | null; perCarat: number }[];
  meleeUsdPerCarat: number;
  settingUsdPerCarat: number;
  labGrownFactor: number;
  spreadPercent: number;
  gemUsdPerCarat: Record<string, number | null>;
  making: Record<string, { perGram: number; percent: number; minimum: number; currency: string }>;
  dutyTaxPercent: Record<string, number>;
  revisedOn?: string;
};

const CURRENCIES = ['PKR', 'GBP', 'EUR'] as const;

const fmt = (n: number | null | undefined, code: string) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? '—'
    : `${code} ${Math.round(n).toLocaleString('en-US')}`;

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** The three coloured stones the panel offers as editable fields. */
const GEM_FIELDS: [key: string, label: string][] = [
  ['Colombian Emerald', 'Emerald'],
  ['Burmese Ruby', 'Ruby'],
  ['Ceylon Royal Blue Sapphire', 'Sapphire']
];

const REGIONS: [code: string, label: string][] = [
  ['PK', 'Pakistan'],
  ['UK', 'United Kingdom'],
  ['EU', 'Europe']
];

/* ------------------------------------------------------------------ *
 * The tab
 * ------------------------------------------------------------------ */

/**
 * Stones, and the two very different kinds of number involved.
 *
 * The panel this replaces put a static table directly beneath one badged
 * "100% AUTOMATIC LIVE MARKET ENGINE", which made the stone rates look like a
 * feed that had died. They were never a feed. Gold has a public spot price
 * because an ounce of gold is an ounce of gold; a diamond is not fungible, and
 * the trade prices off the Rapaport list, which is a paid licence. There is
 * nothing free to point at, and a "live" badge over invented numbers would be
 * worse than an honest static one.
 *
 * So the two halves are separated and each is labelled for what it is. The
 * live half is genuinely live and was previously invisible: the card is
 * written in USD, the shop quotes in PKR, GBP and EUR, and the dollar rate
 * refreshes with the metal feed — so what a stone costs a customer already
 * moves on its own. The judgement half is editable, and says how long it has
 * been since anyone looked at it.
 */
export function StonesTab() {
  const { api } = useAdmin();
  const { notice, say, clear } = useNotice();

  const [market, setMarket] = useState<StoneMarket | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLab, setShowLab] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await api<{ card?: Card; stoneMarket?: StoneMarket; message?: string }>(
      '/api/gold-rates/rate-card'
    );
    if (ok && data.card) {
      setCard(data.card);
      setMarket(data.stoneMarket || null);
      setDraft({});
    } else {
      say(false, data.message || 'The rate card could not be loaded.');
    }
    setLoading(false);
  }, [api, say]);

  useEffect(() => {
    void load();
  }, [load]);

  /** The 1.00 ct tier is the anchor every other diamond band scales from. */
  const oneCaratTier = useMemo(
    () => card?.diamondTiersUsd?.find(t => t.upTo === 1) ?? null,
    [card]
  );

  const value = (key: string, current: number | null | undefined) =>
    draft[key] !== undefined ? draft[key] : current === null || current === undefined ? '' : String(current);

  const set = (key: string, v: string) => setDraft(d => ({ ...d, [key]: v }));

  const dirty = Object.keys(draft).length > 0;

  async function save() {
    if (!card) return;

    const num = (key: string, fallback: number | null | undefined) => {
      const raw = draft[key];
      if (raw === undefined) return fallback;
      const n = Number(raw);
      return Number.isFinite(n) ? n : fallback;
    };

    const patch: Record<string, unknown> = {};

    // The whole tier table is rescaled from the 1 ct anchor rather than asking
    // for nine figures. The shape of the curve — a 2 ct stone being worth far
    // more than two 1 ct stones — is a property of the diamond market, not
    // something the shop re-derives each time it reprices.
    const nextOneCt = num('oneCt', oneCaratTier?.perCarat);
    if (oneCaratTier && nextOneCt && nextOneCt !== oneCaratTier.perCarat) {
      const scale = nextOneCt / oneCaratTier.perCarat;
      patch.diamondTiersUsd = card.diamondTiersUsd.map(t => ({
        upTo: t.upTo,
        perCarat: Math.round(t.perCarat * scale)
      }));
    }

    const simple: [draftKey: string, cardKey: keyof Card][] = [
      ['melee', 'meleeUsdPerCarat'],
      ['setting', 'settingUsdPerCarat'],
      ['labGrown', 'labGrownFactor'],
      ['spread', 'spreadPercent']
    ];
    for (const [k, cardKey] of simple) {
      if (draft[k] !== undefined) patch[cardKey] = num(k, card[cardKey] as number);
    }

    const gemPatch: Record<string, number> = {};
    for (const [key] of GEM_FIELDS) {
      const dk = `gem:${key}`;
      if (draft[dk] !== undefined) gemPatch[key] = num(dk, card.gemUsdPerCarat[key]) as number;
    }
    if (Object.keys(gemPatch).length) patch.gemUsdPerCarat = gemPatch;

    const making: Record<string, unknown> = {};
    const duty: Record<string, number> = {};
    for (const [region] of REGIONS) {
      const rule = card.making[region];
      const keys = ['perGram', 'percent', 'minimum'] as const;
      if (keys.some(f => draft[`mk:${region}:${f}`] !== undefined)) {
        making[region] = {
          ...rule,
          perGram: num(`mk:${region}:perGram`, rule.perGram),
          percent: num(`mk:${region}:percent`, rule.percent),
          minimum: num(`mk:${region}:minimum`, rule.minimum)
        };
      }
      if (draft[`duty:${region}`] !== undefined) {
        duty[region] = num(`duty:${region}`, card.dutyTaxPercent[region]) as number;
      }
    }
    if (Object.keys(making).length) patch.making = making;
    if (Object.keys(duty).length) patch.dutyTaxPercent = duty;

    if (Object.keys(patch).length === 0) {
      say(false, 'Nothing has been changed.');
      return;
    }

    setBusy(true);
    const { ok, data } = await api<{ card?: Card; stoneMarket?: StoneMarket; message?: string }>(
      '/api/gold-rates/rate-card',
      { method: 'PATCH', body: JSON.stringify({ card: patch }) }
    );
    setBusy(false);

    if (ok && data.card) {
      setCard(data.card);
      // Repaint from the server's own arithmetic. Converting in the browser as
      // well would give two places for the figure to be computed and one of
      // them to be wrong.
      if (data.stoneMarket) setMarket(data.stoneMarket);
      setDraft({});
      say(true, data.message || 'Rate card saved.');
    } else {
      say(false, data.message || 'The server refused the change.');
    }
  }

  if (loading) {
    return (
      <Panel title="Stone market">
        <p className="text-sm text-canvas/40">Loading the rate card…</p>
      </Panel>
    );
  }

  if (!card) {
    return (
      <Panel title="Stone market">
        <p role="alert" className="text-sm text-red-300">
          The rate card could not be loaded.
        </p>
        <Button className="mt-4" onClick={() => void load()}>
          Try again
        </Button>
      </Panel>
    );
  }

  const review = market?.review;
  const fx = market?.fx;

  return (
    <>
      {/* ---- what is live, and what is not ---- */}
      <section className="mb-8 border border-gold-400/30 bg-onyx-soft p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-emerald-400 uppercase">
              Live · converts with the market
            </span>
            <h2 className="mt-3 font-serif text-2xl text-canvas">Stone market</h2>
          </div>
          <Button onClick={() => void load()}>Refresh</Button>
        </div>

        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-canvas/55">
          Per-carat figures are held in US dollars and converted at today&rsquo;s rate, so what a
          stone costs your customer moves every time the metal feed refreshes. The dollar figures
          themselves are yours — {market?.anchor.note}
        </p>

        {fx && (
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FxCell
              label="USD → PKR"
              value={fx.usdPkr}
              note={fx.pkrPremiumPercent ? `incl. ${fx.pkrPremiumPercent}% Sarafa premium` : 'at parity'}
            />
            <FxCell label="USD → GBP" value={fx.usdGbp} />
            <FxCell label="USD → EUR" value={fx.usdEur} />
            <div className="border border-white/10 bg-onyx px-4 py-3">
              <dt className="text-[10px] font-semibold tracking-[0.14em] text-canvas/45 uppercase">
                Rates as of
              </dt>
              <dd className="mt-1 text-sm text-canvas/80">{fx.asOf || 'unknown'}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* ---- the review warning ---- */}
      {review && (
        <div
          role={review.stale ? 'alert' : undefined}
          className={`mb-8 border p-4 text-sm ${
            review.stale
              ? 'border-red-500/40 bg-red-500/5 text-red-200'
              : 'border-white/10 bg-onyx-soft text-canvas/60'
          }`}
        >
          {review.revisedOn ? (
            <>
              Dollar figures last reviewed <strong>{review.revisedOn}</strong>
              {review.daysSince !== null && <> — {review.daysSince} days ago</>}.{' '}
              {review.stale
                ? `That is past the ${review.staleAfterDays}-day review point. Diamond prices drift and lab-grown has fallen every year, so these are worth checking against a current price list.`
                : `Next review due after ${review.staleAfterDays} days.`}
            </>
          ) : (
            <>These figures have no review date recorded. Save the card to stamp one.</>
          )}
        </div>
      )}

      {/* ---- converted prices ---- */}
      <Panel
        title="Natural diamond — per carat"
        description="Priced by the stone's own weight, because a 2 ct stone is worth far more than two 1 ct stones. G–H / VS baseline; grade factors scale from here."
      >
        <PriceTable rows={market?.diamond.natural || []} />

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button onClick={() => setShowLab(v => !v)}>
            {showLab ? 'Hide lab-grown' : 'Show lab-grown'}
          </Button>
          {market?.diamond.labGrownFactor !== null && market?.diamond.labGrownFactor !== undefined && (
            <span className="text-xs text-canvas/45">
              Lab-grown is priced at {Math.round(market.diamond.labGrownFactor * 100)}% of natural.
            </span>
          )}
        </div>

        {showLab && (
          <div className="mt-4">
            <PriceTable rows={market?.diamond.labGrown || []} />
          </div>
        )}
      </Panel>

      <Panel
        title="Melee, setting and coloured stones"
        description="Small stones in a pavé or halo are bought by the parcel, far below tier. Coloured stones are flat per carat: origin and treatment move their value more than weight does."
      >
        <Table head={['', 'USD', ...CURRENCIES]}>
          {[
            market?.diamond.melee ? { name: 'Melee (pavé) diamond / ct', ...market.diamond.melee } : null,
            market?.diamond.setting ? { name: 'Stone setting / ct', ...market.diamond.setting } : null,
            ...(market?.gems || []).map(g => ({ ...g, name: `${g.name} / ct` }))
          ]
            .filter((r): r is { name: string } & Money => r !== null)
            .map(r => (
              <Row key={r.name}>
                <Cell className="text-canvas/85">{r.name}</Cell>
                <Cell className="text-canvas/55">{usd(r.usd)}</Cell>
                {CURRENCIES.map(c => (
                  <Cell key={c} className="font-medium text-gold-300">
                    {fmt(r.local[c], c)}
                  </Cell>
                ))}
              </Row>
            ))}
        </Table>
      </Panel>

      {/* ---- the editable half ---- */}
      <section className="mb-8 border border-white/10 bg-onyx-soft p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block border border-white/20 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-canvas/50 uppercase">
              Your figures · not a feed
            </span>
            <h2 className="mt-3 font-serif text-2xl text-canvas">What the prices are anchored to</h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-canvas/50">
              Change the 1.00 ct anchor and the whole tier table moves with it, keeping the shape of
              the curve. Everything here is in US dollars.
            </p>
          </div>
          <Button kind="primary" disabled={!dirty || busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save rate card'}
          </Button>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="1.00 ct anchor — USD / ct"
            type="number"
            min={0}
            step={50}
            value={value('oneCt', oneCaratTier?.perCarat)}
            onChange={e => set('oneCt', e.target.value)}
            hint="Every other band rescales from this."
          />
          <Field
            label="Melee — USD / ct"
            type="number"
            min={0}
            step={20}
            value={value('melee', card.meleeUsdPerCarat)}
            onChange={e => set('melee', e.target.value)}
          />
          <Field
            label="Stone setting — USD / ct"
            type="number"
            min={0}
            step={5}
            value={value('setting', card.settingUsdPerCarat)}
            onChange={e => set('setting', e.target.value)}
          />
          <Field
            label="Lab-grown factor"
            type="number"
            min={0.01}
            max={1}
            step={0.01}
            value={value('labGrown', card.labGrownFactor)}
            onChange={e => set('labGrown', e.target.value)}
            hint="Share of the natural price. Falling year on year."
          />
          {GEM_FIELDS.map(([key, label]) => (
            <Field
              key={key}
              label={`${label} — USD / ct`}
              type="number"
              min={0}
              step={50}
              value={value(`gem:${key}`, card.gemUsdPerCarat[key])}
              onChange={e => set(`gem:${key}`, e.target.value)}
            />
          ))}
          <Field
            label="Estimate spread ±%"
            type="number"
            min={0}
            max={60}
            step={1}
            value={value('spread', card.spreadPercent)}
            onChange={e => set('spread', e.target.value)}
            hint="How wide the quoted range is."
          />
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <h3 className="text-[10px] font-semibold tracking-[0.14em] text-canvas/45 uppercase">
            Making charges and duty, by market
          </h3>
          <div className="mt-4 grid gap-6 lg:grid-cols-3">
            {REGIONS.map(([code, label]) => {
              const rule = card.making[code];
              if (!rule) return null;
              return (
                <div key={code} className="border border-white/10 p-4">
                  <p className="text-sm font-medium text-canvas/85">
                    {label} <span className="text-canvas/40">({rule.currency})</span>
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field
                      label="Per gram"
                      type="number"
                      min={0}
                      value={value(`mk:${code}:perGram`, rule.perGram)}
                      onChange={e => set(`mk:${code}:perGram`, e.target.value)}
                    />
                    <Field
                      label="% of metal"
                      type="number"
                      min={0}
                      step={0.5}
                      value={value(`mk:${code}:percent`, rule.percent)}
                      onChange={e => set(`mk:${code}:percent`, e.target.value)}
                    />
                    <Field
                      label="Minimum"
                      type="number"
                      min={0}
                      value={value(`mk:${code}:minimum`, rule.minimum)}
                      onChange={e => set(`mk:${code}:minimum`, e.target.value)}
                    />
                    <Field
                      label="Duty / tax %"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={value(`duty:${code}`, card.dutyTaxPercent[code])}
                      onChange={e => set(`duty:${code}`, e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Notice notice={notice} onDone={clear} />
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

function FxCell({ label, value, note }: { label: string; value: number | null; note?: string }) {
  return (
    <div className="border border-white/10 bg-onyx px-4 py-3">
      <dt className="text-[10px] font-semibold tracking-[0.14em] text-canvas/45 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-canvas">
        {value === null || !Number.isFinite(value) ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 4 })}
      </dd>
      {note && <dd className="mt-0.5 text-[11px] text-canvas/35">{note}</dd>}
    </div>
  );
}

function PriceTable({ rows }: { rows: Band[] }) {
  return (
    <Table head={['Weight', 'USD / ct', ...CURRENCIES.map(c => `${c} / ct`)]} empty="No tiers on the card.">
      {rows.map(r => (
        <Row key={r.label}>
          <Cell className="text-canvas/85">{r.label}</Cell>
          <Cell className="text-canvas/55">{usd(r.usd)}</Cell>
          {CURRENCIES.map(c => (
            <Cell key={c} className="font-medium text-gold-300">
              {fmt(r.local[c], c)}
            </Cell>
          ))}
        </Row>
      ))}
    </Table>
  );
}

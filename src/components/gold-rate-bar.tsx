import { getDiamondGuide, getFx, getGoldRates } from '@/lib/money';
import { formatMoney, convert, type Fx } from '@/lib/currency';
import { getLocale, type Locale, type LocaleCode } from '@/lib/locales';

/**
 * The day's bullion quotes and the diamond guide, across the top of every page.
 *
 * The whole catalogue says "daily rate — enquire" rather than carrying a price,
 * which only means something if the reader can see what today's rate actually
 * is. The old site had this bar; the migration had left it behind, so the new
 * one was asking people to enquire against a number it never showed them.
 *
 * Rendered on the server from the rate document. The old bar fetched on load
 * and then polled every five minutes — a request per visitor per five minutes
 * for a figure the shop updates a few times a day. The page is revalidated
 * hourly instead, and the quotes carry the time they were taken so nobody has
 * to guess how fresh they are.
 */

/** One quote, priced in the market's own currency alongside the rupee figure. */
function Quote({
  label,
  pkr,
  currency,
  fx
}: {
  label: string;
  pkr: number;
  currency: Locale['currency'];
  fx: Fx;
}) {
  const local = currency === 'PKR' ? null : formatMoney(convert(pkr, currency, fx), currency);
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-gold-200/70">{label}</span>
      <strong className="font-semibold text-white">PKR {pkr.toLocaleString('en-GB')}</strong>
      {local && <span className="text-gold-200/70">({local})</span>}
    </span>
  );
}

export async function GoldRateBar({ locale }: { locale: LocaleCode }) {
  const [rates, fx, diamonds] = await Promise.all([getGoldRates(), getFx(), getDiamondGuide()]);
  const { currency } = getLocale(locale);

  // Nullable throughout: silver has no default in the schema and the karat
  // lines can be absent before the first sync. A ticker printing "PKR 0 / tola"
  // on a jewellery site is worse than one short line — it is a price, and it is
  // wrong. Whatever is missing is dropped.
  const quoted: [label: string, pkr: number | null][] = [
    ['24K / tola', rates.perTola24k],
    ['24K / 10g', rates.per10g24k],
    ['24K / 1g', rates.per1g24k],
    ['22K / tola', rates.perTola22k],
    ['18K / tola', rates.perTola18k],
    ['Silver / tola', rates.silverPerTola]
  ];
  const lines = quoted.filter((l): l is [string, number] => l[1] !== null);

  // Nothing to say beats saying it wrong. A shop that sells at the day's rate
  // cannot publish a guessed one.
  if (lines.length === 0) return null;

  const taken = rates.asOf
    ? new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      }).format(new Date(rates.asOf)) + ' UTC'
    : null;

  /**
   * The whole line, rendered twice.
   *
   * The bar carries about twice what fits on a laptop, so it travels rather
   * than sitting still — the same behaviour the old site had and the port
   * dropped, which left everything past the fifth quote reachable only by
   * dragging the bar sideways. The duplicate is hidden from assistive tech so
   * the quotes are not announced twice.
   */
  const run = (
    <>
      <span className="shrink-0 bg-gold-400 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-onyx uppercase">
        Live rate
      </span>
      {lines.map(([label, pkr]) => (
        <Quote key={label} label={label} pkr={pkr} currency={currency} fx={fx} />
      ))}

      {/*
        Diamonds get their own badge, and it does not say "live".

        The bullion figures beside them come from a public spot feed. These
        cannot: a diamond is not fungible, and the trade prices off the
        Rapaport list, which is a paid licence. Carrying them under the same
        "Live rate" tag would tell a customer that the shop's own judgement
        figure is today's market. What is genuinely live is the conversion —
        the guide is held in dollars and follows the FX feed into whatever
        currency the visitor is being quoted in.
      */}
      {diamonds.lines.length > 0 && (
        <>
          <span
            title="Indicative per-carat guide, not a market rate. Diamonds are priced individually — a firm quote needs the stone."
            className="shrink-0 border border-diamond-300/50 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-diamond-200 uppercase"
          >
            Diamond guide
          </span>
          {diamonds.lines.map(d => (
            <Quote key={d.label} label={d.label} pkr={d.pkr} currency={currency} fx={fx} />
          ))}
        </>
      )}

      {taken && <span className="shrink-0 whitespace-nowrap text-gold-200/50">taken {taken}</span>}
    </>
  );

  return (
    <aside
      aria-label="Today's gold and diamond prices"
      className="overflow-hidden border-b border-white/10 bg-onyx-soft text-[11px] tracking-[0.08em] text-gold-200 motion-reduce:overflow-x-auto"
    >
      <div
        className="flex w-max items-center gap-5 py-2 pl-6 font-sans animate-[ticker_60s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none"
      >
        <div className="flex shrink-0 items-center gap-5 pr-5">{run}</div>
        {/* The second run is what makes the loop seamless. It is decoration. */}
        <div className="flex shrink-0 items-center gap-5 pr-5" aria-hidden="true">
          {run}
        </div>
      </div>
    </aside>
  );
}

import { getFx, getGoldRates } from '@/lib/money';
import { formatMoney, convert, type Fx } from '@/lib/currency';
import { getLocale, type Locale, type LocaleCode } from '@/lib/locales';

/**
 * The day's bullion quotes, across the top of every page.
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
  const [rates, fx] = await Promise.all([getGoldRates(), getFx()]);
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

  return (
    <aside
      aria-label="Today's gold rates"
      className="border-b border-white/10 bg-onyx-soft text-[11px] tracking-[0.08em] text-gold-200"
    >
      {/* Scrolls within itself rather than wrapping into three rows on a phone
          or pushing the whole page sideways. */}
      <div className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-6 py-2 font-sans">
        <span className="shrink-0 bg-gold-400 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-onyx uppercase">
          Live rate
        </span>
        {lines.map(([label, pkr]) => (
          <Quote key={label} label={label} pkr={pkr} currency={currency} fx={fx} />
        ))}
        {taken && (
          <span className="shrink-0 whitespace-nowrap text-gold-200/50">taken {taken}</span>
        )}
      </div>
    </aside>
  );
}

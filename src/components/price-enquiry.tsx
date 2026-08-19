import { SITE } from '@/lib/seo';
import type { Product } from '@/lib/catalogue';
import { productHandle } from '@/lib/handles';
import { href, type LocaleCode } from '@/lib/locales';

/**
 * "Ask for today's price" — the enquiry the catalogue keeps promising.
 *
 * Every card and product page says the piece is sold at the day's rate and to
 * enquire, and until now there was nothing to enquire with.
 *
 * It opens WhatsApp with the message written, rather than posting to
 * /api/whatsapp/send as the old cart did. That route sends from the shop's own
 * Twilio number to the shop's own number, so the message arrives carrying the
 * product and quantity and no way at all to reach the person asking — and the
 * page then told them "we will message you shortly", which the shop could not
 * do. Opening wa.me sends it from the customer's own account, so the shop gets
 * a real conversation it can reply to. It also needs no Twilio credentials, no
 * request, and works when the API is down.
 *
 * A plain link, so it needs no JavaScript and a crawler sees an ordinary
 * anchor rather than an empty button.
 */
export function PriceEnquiry({
  product,
  locale
}: {
  product: Product;
  locale: LocaleCode;
}) {
  const url = `${SITE.url}${href(locale, `/product/${productHandle(product)}`)}`;

  const message = [
    `Hello ${SITE.name},`,
    '',
    `I would like today's price for:`,
    `• ${product.name} (ref ${product.id})`,
    '',
    url
  ].join('\n');

  const wa = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={wa}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 block w-full border border-onyx px-6 py-3.5 text-center font-sans text-[11px] font-bold tracking-[0.2em] text-ink uppercase transition-colors hover:bg-onyx hover:text-gold-200"
    >
      Ask for today&rsquo;s price
    </a>
  );
}

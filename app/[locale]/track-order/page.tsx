import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TrackView } from '@/components/track/track-view';
import { getLocale, href, isLocaleCode } from '@/lib/locales';
import { getFx } from '@/lib/money';

/**
 * Kept at /track-order, the path the old page used, so links already shared
 * with customers and anything Google has indexed still resolve.
 *
 * The page itself is indexable — it explains a service the shop offers — but a
 * result is one person's order, and the reference lives in the query string
 * where it is not indexed on its own.
 */
export const metadata: Metadata = {
  title: 'Track your order',
  description:
    'Follow your Lavion Gems & Jewellers order using your reference or the phone number you ordered with.',
  alternates: { canonical: '/track-order' }
};

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  const active = getLocale(isLocaleCode(locale) ? locale : undefined);
  const fx = await getFx();
  return (
    <Suspense fallback={null}>
      <TrackView currency={active.currency} fx={fx} />
    </Suspense>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { FREE_SHIPPING_OVER, formatPKR, useCart } from '@/lib/cart';
import { isEmbeddedImage } from '@/lib/images';
import { productHandle } from '@/lib/handles';
import { Field, FormError, SubmitButton } from '@/components/form';

const PAYMENT_METHODS = [
  'Cash on Delivery (COD)',
  'Direct Bank Transfer (IBFT)',
  'Credit / Debit Card'
];

type Placed = { id: string; total: number };

export function CartView() {
  const { items, subtotal, shipping, total, ready, setQty, remove, clear } = useCart();
  const { user, api } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || items.length === 0) return;
    setBusy(true);
    setError(null);

    const f = new FormData(e.currentTarget);
    const reference = String(f.get('reference') || '').trim();
    const method = String(f.get('payment') || PAYMENT_METHODS[0]);

    const { ok, data } = await api<{ order?: { id: string; total: number } }>('/api/orders', {
      method: 'POST',
      body: {
        customer: String(f.get('customer') || ''),
        email: String(f.get('email') || '') || user?.email || '',
        phone: String(f.get('phone') || ''),
        city: String(f.get('city') || ''),
        address: String(f.get('address') || ''),
        payment: reference ? `${method} (Ref: ${reference})` : method,
        // The server stores the line items as one readable string.
        items: items.map(i => `${i.name} (x${i.qty})`).join(', '),
        total,
        notes: String(f.get('notes') || '')
      }
    });

    if (ok && data.order) {
      setPlaced({ id: data.order.id, total: data.order.total ?? total });
      clear();
      return;
    }

    setError(data.message || 'We could not place your order. Please try again.');
    setBusy(false);
  }

  if (placed) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-gold-600">
          Thank you
        </p>
        <h1 className="mt-4 font-serif text-4xl font-light text-ink">Your order is with us</h1>
        <p className="mt-6 font-sans text-sm leading-relaxed text-ink-muted">
          Your reference is{' '}
          <strong className="font-mono text-ink">{placed.id}</strong>. Keep it — you can
          follow your order with it at any time.
        </p>
        <p className="mt-4 font-sans text-sm leading-relaxed text-ink-muted">
          We will confirm the final price against today&rsquo;s gold rate and contact you
          before anything is charged.
        </p>
        <Link
          href="/"
          className="mt-10 inline-block bg-onyx px-8 py-4 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-gold-200"
        >
          Continue browsing
        </Link>
      </main>
    );
  }

  // Until the bag has been read back from storage, showing "empty" would be a
  // guess — and the wrong one for anyone who actually has pieces in it.
  if (!ready) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-24">
        <p className="font-sans text-sm text-ink-muted">Fetching your bag…</p>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-4xl font-light text-ink">Your bag is empty</h1>
        <p className="mt-4 font-sans text-sm text-ink-muted">
          Nothing has been added yet.
        </p>
        <Link
          href="/"
          className="mt-10 inline-block bg-onyx px-8 py-4 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-gold-200"
        >
          Browse the collections
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-serif text-4xl font-light text-ink">Your bag</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-hairline border-y border-hairline">
          {items.map(item => (
            <li key={item.id} className="flex gap-5 py-6">
              <Link
                href={`/product/${productHandle(item)}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden bg-canvas-soft"
              >
                <Image
                  src={item.img}
                  alt={item.name}
                  fill
                  sizes="96px"
                  unoptimized={isEmbeddedImage(item.img)}
                  className="object-cover"
                />
              </Link>

              <div className="flex-1">
                <Link href={`/product/${productHandle(item)}`}>
                  <h2 className="font-serif text-lg text-ink hover:text-gold-600">
                    {item.name}
                  </h2>
                </Link>
                <p className="mt-1 font-sans text-xs text-ink-muted">{item.desc}</p>

                <div className="mt-3 flex items-center gap-4">
                  <label className="sr-only" htmlFor={`qty-${item.id}`}>
                    Quantity for {item.name}
                  </label>
                  <input
                    id={`qty-${item.id}`}
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={e => setQty(item.id, Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 border border-hairline bg-canvas-pure px-3 py-2 font-sans text-sm text-ink outline-none focus:border-gold-400"
                  />
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="font-sans text-xs text-ink-faint underline hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <p className="font-sans text-sm text-ink">{formatPKR(item.price * item.qty)}</p>
            </li>
          ))}
        </ul>

        <div>
          <div className="border border-hairline bg-canvas-soft p-6">
            <dl className="space-y-2 font-sans text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="text-ink">{formatPKR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Delivery</dt>
                <dd className="text-ink">
                  {shipping === 0 ? 'Free' : formatPKR(shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-hairline pt-3 font-semibold">
                <dt className="text-ink">Indicative total</dt>
                <dd className="text-ink">{formatPKR(total)}</dd>
              </div>
            </dl>

            {/*
              Saying "total" and meaning it would be a promise the shop cannot
              keep: an order is stored unconfirmed and priced against the day's
              bullion rate before anyone is charged. The old cart printed a
              figure with no such caveat.
            */}
            <p className="mt-4 font-sans text-xs leading-relaxed text-ink-faint">
              Gold is priced against the day&rsquo;s rate, so this is an estimate. We
              confirm the final figure with you before taking payment.
            </p>

            {subtotal < FREE_SHIPPING_OVER && (
              <p className="mt-3 font-sans text-xs text-gold-600">
                Spend {formatPKR(FREE_SHIPPING_OVER - subtotal)} more for free delivery.
              </p>
            )}
          </div>

          <form onSubmit={onSubmit} noValidate className="mt-8">
            <h2 className="mb-5 font-serif text-2xl font-light text-ink">Delivery details</h2>
            <FormError>{error}</FormError>

            <Field label="Full name" id="customer" required defaultValue={user?.name || ''} autoComplete="name" />
            <Field label="Email" id="email" type="email" defaultValue={user?.email || ''} autoComplete="email" />
            <Field label="Phone" id="phone" required autoComplete="tel" />
            <Field label="City" id="city" required defaultValue={user?.city || ''} autoComplete="address-level2" />
            <Field label="Delivery address" id="address" required autoComplete="street-address" />

            <div className="mb-5">
              <label
                htmlFor="payment"
                className="mb-2 block font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-faint"
              >
                Payment method
              </label>
              <select
                id="payment"
                name="payment"
                className="w-full border border-hairline bg-canvas-pure px-4 py-3 font-sans text-sm text-ink outline-none focus:border-gold-400"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Payment reference (optional)"
              id="reference"
              placeholder="Bank transfer reference, if you have one"
            />
            <Field label="Notes (optional)" id="notes" placeholder="Sizing, engraving, delivery timing" />

            <SubmitButton busy={busy}>Place order</SubmitButton>
          </form>
        </div>
      </div>
    </main>
  );
}

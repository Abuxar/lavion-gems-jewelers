'use client';

import Link from 'next/link';

/**
 * The pieces every auth screen is made of.
 *
 * Five screens ask for an email and a password in slightly different
 * combinations. Defining the field once means they cannot drift apart in
 * spacing, focus ring or error styling — which is exactly how the old pages
 * ended up with fifteen not-quite-identical headers.
 */

export function AuthCard({
  title,
  intro,
  children,
  footer
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-md px-6 py-20">
      <h1 className="font-serif text-3xl font-light text-ink">{title}</h1>
      {intro && (
        <p className="mt-3 font-sans text-sm leading-relaxed text-ink-muted">{intro}</p>
      )}
      <div className="mt-8">{children}</div>
      {footer && (
        <div className="mt-8 border-t border-hairline pt-6 font-sans text-sm text-ink-muted">
          {footer}
        </div>
      )}
    </main>
  );
}

export function Field({
  label,
  id,
  ...props
}: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-5">
      <label
        htmlFor={id}
        className="mb-2 block font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-faint"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        className="w-full border border-hairline bg-canvas-pure px-4 py-3 font-sans text-sm text-ink outline-none focus:border-gold-400"
        {...props}
      />
    </div>
  );
}

/**
 * role="alert" so a screen reader announces the failure. Without it the message
 * appears silently and someone not looking at that part of the page is told
 * nothing at all.
 */
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="mb-5 border-l-2 border-red-700 bg-red-50 px-4 py-3 font-sans text-sm text-red-900"
    >
      {children}
    </p>
  );
}

export function FormNote({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="mb-5 border-l-2 border-gold-400 bg-canvas-soft px-4 py-3 font-sans text-sm text-ink-muted">
      {children}
    </p>
  );
}

export function SubmitButton({
  busy,
  children
}: {
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full bg-onyx px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-gold-200 transition-colors hover:bg-charcoal disabled:opacity-60"
    >
      {busy ? 'Please wait…' : children}
    </button>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-gold-600 underline underline-offset-2 hover:text-gold-700">
      {children}
    </Link>
  );
}

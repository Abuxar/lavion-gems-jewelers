'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The small shared pieces every tab needs.
 *
 * Styling here is deliberately plain and built from the theme tokens — the
 * panel is internal, so it is the one part of the site the redesign has no
 * reason to touch, but there is no sense in it being ornate either.
 */

export function Panel({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 border border-white/10 bg-onyx-soft p-6">
      <h2 className="font-sans text-sm font-bold tracking-[0.14em] text-gold-300 uppercase">
        {title}
      </h2>
      {description && (
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-canvas/50">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'good' }) {
  const colour =
    tone === 'warn' ? 'text-red-400' : tone === 'good' ? 'text-emerald-400' : 'text-gold-300';
  return (
    <div className="border border-white/10 bg-onyx-soft px-5 py-4">
      <div className="text-[10px] font-semibold tracking-[0.14em] text-canvas/45 uppercase">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${colour}`}>{value}</div>
    </div>
  );
}

export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold tracking-[0.14em] text-canvas/45 uppercase">
        {label}
      </span>
      <input
        {...props}
        className="mt-1.5 w-full border border-white/15 bg-onyx px-3 py-2 text-sm text-canvas placeholder:text-canvas/25 focus:border-gold-400 focus:outline-none"
      />
      {hint && <span className="mt-1 block text-[11px] text-canvas/35">{hint}</span>}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold tracking-[0.14em] text-canvas/45 uppercase">
        {label}
      </span>
      <textarea
        {...props}
        className="mt-1.5 w-full border border-white/15 bg-onyx px-3 py-2 text-sm leading-relaxed text-canvas placeholder:text-canvas/25 focus:border-gold-400 focus:outline-none"
      />
      {hint && <span className="mt-1 block text-[11px] text-canvas/35">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold tracking-[0.14em] text-canvas/45 uppercase">
        {label}
      </span>
      <select
        {...props}
        className="mt-1.5 w-full border border-white/15 bg-onyx px-3 py-2 text-sm text-canvas focus:border-gold-400 focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export function Button({
  kind = 'secondary',
  className = '',
  ...props
}: { kind?: 'primary' | 'secondary' | 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: 'bg-gold-400 text-onyx hover:bg-gold-300',
    secondary: 'border border-white/20 text-canvas hover:border-gold-400 hover:text-gold-300',
    danger: 'border border-red-500/50 text-red-300 hover:bg-red-500/10'
  }[kind];

  return (
    <button
      type="button"
      {...props}
      className={`px-4 py-2 text-[11px] font-bold tracking-[0.14em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Table({
  head,
  children,
  empty
}: {
  head: string[];
  children: React.ReactNode;
  empty?: string;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    // Wide tables scroll inside their own box rather than pushing the page
    // sideways, which on a laptop is how a column ends up permanently offscreen.
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-onyx">
            {head.map(h => (
              <th
                key={h}
                className="px-4 py-3 text-[10px] font-semibold tracking-[0.12em] text-canvas/45 uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hasRows ? (
            children
          ) : (
            <tr>
              <td colSpan={head.length} className="px-4 py-10 text-center text-sm text-canvas/40">
                {empty || 'Nothing here.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">{children}</tr>;
}

export function Cell({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

/**
 * A message that says whether the last thing you did worked.
 *
 * It clears itself after a while, because a stale "saved" beside a form you
 * have since edited again is worse than no message at all.
 */
export function Notice({
  notice,
  onDone
}: {
  notice: { ok: boolean; text: string } | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(onDone, 6000);
    return () => clearTimeout(t);
  }, [notice, onDone]);

  if (!notice) return null;
  return (
    <p
      role={notice.ok ? 'status' : 'alert'}
      className={`mt-3 text-sm ${notice.ok ? 'text-emerald-400' : 'text-red-400'}`}
    >
      {notice.text}
    </p>
  );
}

/**
 * The notice plus its setter, since every tab wants exactly this pair.
 *
 * Both functions are memoised, and that is load-bearing rather than tidiness.
 * A tab that puts `say` in the dependency array of the useCallback it loads
 * its data with gets a new `load` on every render, and its effect refetches
 * forever. `clear` is passed to Notice, whose timer effect depends on it, so
 * an unstable one restarts the six-second countdown on every unrelated render
 * and the message never clears itself.
 */
export function useNotice() {
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const clear = useCallback(() => setNotice(null), []);
  const say = useCallback((ok: boolean, text: string) => setNotice({ ok, text }), []);
  return { notice, clear, say };
}

export const money = (n: number) => `PKR ${Math.round(n).toLocaleString('en-GB')}`;

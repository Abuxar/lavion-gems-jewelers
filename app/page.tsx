'use client';

import { useEffect, useState } from 'react';

type Health = {
  status?: string;
  database?: string;
  databaseNote?: string;
  time?: string;
};

const GOLD_RAMP = [
  'bg-gold-100', 'bg-gold-200', 'bg-gold-300', 'bg-gold-400',
  'bg-gold-500', 'bg-gold-600', 'bg-gold-700'
];

/**
 * A scaffold page, not the shop.
 *
 * Its only job is to prove the three things the migration rests on before any
 * real UI is built on top of them: that the Tailwind theme carries the brand
 * tokens, that both fonts load, and that a request to /api reaches the existing
 * Express server and its database. The redesign replaces this file entirely.
 */
export default function Page() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setHealth)
      .catch(e => setError(e.message));
  }, []);

  return (
    <main className="min-h-screen bg-canvas px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-gold-600">
          Migration scaffold
        </p>
        <h1 className="mt-4 font-serif text-5xl font-light text-ink">
          Lavion <span className="text-gold-500">Gems</span> &amp; Jewellers
        </h1>
        <p className="mt-4 font-sans text-sm leading-relaxed text-ink-muted">
          Next.js, TypeScript and Tailwind are running. The Express API is mounted
          underneath, unchanged.
        </p>

        <div className="mt-12 border-t border-hairline pt-8">
          <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
            Gold ramp
          </h2>
          <div className="mt-3 flex h-12 overflow-hidden rounded-sm">
            {GOLD_RAMP.map(c => (
              <div key={c} className={`flex-1 ${c}`} />
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-hairline pt-8">
          <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
            API bridge
          </h2>
          <div className="mt-3 bg-onyx p-6">
            {error && (
              <p className="font-mono text-sm text-red-400">Unreachable — {error}</p>
            )}
            {!error && !health && (
              <p className="font-mono text-sm text-ink-faint">Checking…</p>
            )}
            {health && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-sm">
                <dt className="text-gold-300">status</dt>
                <dd className="text-canvas">{health.status}</dd>
                <dt className="text-gold-300">database</dt>
                <dd className="text-canvas">{health.database}</dd>
                {health.databaseNote && (
                  <>
                    <dt className="text-gold-300">note</dt>
                    <dd className="text-ink-faint">{health.databaseNote}</dd>
                  </>
                )}
              </dl>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

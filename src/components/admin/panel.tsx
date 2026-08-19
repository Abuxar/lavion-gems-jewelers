'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/lib/admin-auth';
import { AdminSignIn } from '@/components/admin/sign-in';
import { DashboardTab } from '@/components/admin/dashboard-tab';
import { CatalogueTab } from '@/components/admin/catalogue-tab';
import { StockTab } from '@/components/admin/stock-tab';
import { OrdersTab } from '@/components/admin/orders-tab';
import { NewsletterTab } from '@/components/admin/newsletter-tab';
import { Button } from '@/components/admin/ui';

export type AdminProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  badge: string;
  img: string;
  desc: string;
};

export type AdminOrder = {
  id: string;
  customer: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  payment?: string;
  items: string;
  total: number;
  status: string;
  priceConfirmed?: boolean;
  date?: string;
};

const TABS = ['Dashboard', 'Catalogue', 'Stock', 'Orders', 'Newsletter'] as const;
type Tab = (typeof TABS)[number];

/**
 * The admin panel.
 *
 * The catalogue and the order book are loaded once here and passed down, rather
 * than each tab fetching its own copy — the dashboard counts the same products
 * the catalogue tab lists and the same orders the orders tab shows, and three
 * separate fetches is three chances for them to disagree on screen.
 *
 * A tab that changes something calls onChanged, which reloads both, so every
 * tab is looking at what the server actually holds rather than at whatever it
 * believed before the save.
 */
export function AdminPanel() {
  const { signedIn, username, signOut, api } = useAdmin();

  const [tab, setTab] = useState<Tab>('Dashboard');
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(null);

    const [p, o] = await Promise.all([
      api<{ products?: AdminProduct[] }>('/api/products'),
      api<{ orders?: AdminOrder[] }>('/api/orders')
    ]);

    if (p.ok) setProducts(p.data.products || []);
    if (o.ok) setOrders(o.data.orders || []);

    // Being signed out mid-shift is not a failure to report — the panel drops
    // back to the sign-in screen on its own.
    if (!p.ok && p.status !== 401) {
      setFailed(p.data.message || 'The catalogue could not be loaded.');
    } else if (!o.ok && o.status !== 401) {
      setFailed(o.data.message || 'The order book could not be loaded.');
    }

    setLoading(false);
  }, [api]);

  useEffect(() => {
    if (signedIn) void load();
  }, [signedIn, load]);

  if (!signedIn) return <AdminSignIn />;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="font-sans text-sm font-bold tracking-[0.2em] text-gold-300 uppercase">
            Lavion Admin
          </h1>
          <p className="mt-1 text-[11px] text-canvas/40">
            Signed in as {username}. The session lasts eight hours.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button kind="danger" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Admin sections">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            aria-current={tab === t ? 'page' : undefined}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[11px] font-bold tracking-[0.14em] uppercase transition-colors ${
              tab === t
                ? 'bg-gold-400 text-onyx'
                : 'border border-white/15 text-canvas/60 hover:text-gold-300'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {failed && (
        <p role="alert" className="mt-6 border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-300">
          {failed}
        </p>
      )}

      <div className="mt-8">
        {tab === 'Dashboard' && <DashboardTab products={products} orders={orders} />}
        {tab === 'Catalogue' && <CatalogueTab products={products} onChanged={load} />}
        {tab === 'Stock' && <StockTab products={products} onChanged={load} />}
        {tab === 'Orders' && <OrdersTab orders={orders} onChanged={load} />}
        {tab === 'Newsletter' && <NewsletterTab />}
      </div>
    </div>
  );
}

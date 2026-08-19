'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';
import type { Product } from './catalogue';

/**
 * The bag, stored exactly where the old site stored it.
 *
 * Same key, same item shape — deliberately. Anyone who left pieces in their bag
 * before the migration still has them in localStorage, and changing either
 * would silently empty it on their next visit.
 */
const CART_KEY = 'lavion_cart_v1';

export type CartItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  img: string;
  desc: string;
  qty: number;
};

/** Free over this, otherwise a flat fee — the thresholds the old cart used. */
export const FREE_SHIPPING_OVER = 50000;
export const SHIPPING_FEE = 1500;

type CartState = {
  items: CartItem[];
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  /** Whether the bag has been read back from storage yet. */
  ready: boolean;
  add: (product: Product, qty?: number) => { ok: boolean; message: string };
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(i => i && i.id) : [];
  } catch {
    // A corrupt bag is not worth an error page; an empty one is recoverable.
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  /**
   * Read on mount rather than during render. localStorage does not exist on the
   * server, and seeding state from it directly would make the first client
   * render disagree with the server's HTML — a hydration mismatch.
   */
  useEffect(() => {
    setItems(read());
    setReady(true);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(next));
    } catch {
      // Private browsing can refuse writes. The bag still works for this page.
    }
  }, []);

  const add = useCallback(
    (product: Product, qty = 1) => {
      if (product.stock <= 0) {
        return { ok: false, message: `${product.name} is out of stock.` };
      }
      const current = read();
      const at = current.findIndex(i => i.id === product.id);
      const wanted = (at > -1 ? current[at].qty : 0) + qty;

      if (wanted > product.stock) {
        return {
          ok: false,
          message: `Only ${product.stock} available.`
        };
      }

      const next = [...current];
      if (at > -1) {
        next[at] = { ...next[at], qty: wanted };
      } else {
        next.push({
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          img: product.img,
          desc: product.desc,
          qty
        });
      }
      persist(next);
      return { ok: true, message: `${product.name} added to your bag.` };
    },
    [persist]
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      const next = read()
        .map(i => (i.id === id ? { ...i, qty } : i))
        .filter(i => i.qty > 0);
      persist(next);
    },
    [persist]
  );

  const remove = useCallback(
    (id: string) => persist(read().filter(i => i.id !== id)),
    [persist]
  );

  const clear = useCallback(() => persist([]), [persist]);

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const shipping = items.length === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        subtotal,
        shipping,
        total: subtotal + shipping,
        ready,
        add,
        setQty,
        remove,
        clear
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

export function formatPKR(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString('en-PK')}`;
}

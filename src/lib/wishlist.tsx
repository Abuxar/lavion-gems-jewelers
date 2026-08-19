'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Saved pieces, kept where the old site kept them.
 *
 * Same key as before, and the same contents: bare product ids, not copies of
 * the products. That is the better shape anyway — a saved piece whose price or
 * photograph has since changed should show what it is now, not a snapshot of
 * what it was when someone tapped the heart. It does mean the list is
 * meaningless without the catalogue, which is why the page resolves the ids
 * against products it was handed by the server.
 */
const WISHLIST_KEY = 'lavion_wishlist_v1';

type WishlistState = {
  ids: string[];
  ready: boolean;
  has: (id: string) => boolean;
  toggle: (id: string) => boolean;
  remove: (id: string) => void;
};

const WishlistContext = createContext<WishlistState | null>(null);

function read(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  // On mount, not during render — localStorage does not exist on the server,
  // and reading it while rendering makes the first client pass disagree with
  // the server's HTML.
  useEffect(() => {
    setIds(read());
    setReady(true);
  }, []);

  const persist = useCallback((next: string[]) => {
    setIds(next);
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    } catch {
      // Private browsing can refuse writes; the list still works for this page.
    }
  }, []);

  const has = useCallback((id: string) => ids.includes(String(id)), [ids]);

  /** Returns whether the piece is saved after the toggle, for the button label. */
  const toggle = useCallback(
    (id: string) => {
      const key = String(id);
      const current = read();
      const next = current.includes(key)
        ? current.filter(x => x !== key)
        : [...current, key];
      persist(next);
      return next.includes(key);
    },
    [persist]
  );

  const remove = useCallback(
    (id: string) => persist(read().filter(x => x !== String(id))),
    [persist]
  );

  return (
    <WishlistContext.Provider value={{ ids, ready, has, toggle, remove }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}

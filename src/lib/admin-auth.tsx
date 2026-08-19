'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/**
 * The admin session.
 *
 * /api/auth/admin-login returns an eight-hour bearer token and, unlike the
 * customer side, no refresh cookie — so there is nothing to trade for a new one
 * and the token itself is the whole session.
 *
 * It is held in memory rather than in sessionStorage, where the old panel kept
 * it. Anything that can run script on this page could read it out of storage,
 * and eight hours of admin is the most valuable credential the site has. The
 * cost is that a hard reload signs you out; the panel is a single route with
 * tabs rather than pages, so that only happens if you actually reload.
 */

type AdminApi = <T = Record<string, unknown>>(
  path: string,
  init?: RequestInit
) => Promise<{ ok: boolean; status: number; data: T & { message?: string; success?: boolean } }>;

type AdminAuth = {
  signedIn: boolean;
  username: string | null;
  signIn: (username: string, password: string) => Promise<{ ok: boolean; message: string }>;
  signOut: () => void;
  api: AdminApi;
};

const Ctx = createContext<AdminAuth | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  // A ref, not state: every request reads the current token, and re-rendering
  // the whole panel because a token arrived is not what the token is for.
  const token = useRef<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const api = useCallback<AdminApi>(async (path, init = {}) => {
    const res = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token.current ? { Authorization: `Bearer ${token.current}` } : {}),
        ...(init.headers || {})
      }
    });

    let data: Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {
      data = { message: `The server returned ${res.status} with no readable body.` };
    }

    // An expired token is the ordinary end of an eight-hour shift, not a fault.
    // Clearing it here means the panel falls back to the sign-in screen rather
    // than showing empty tables that look like a database outage.
    if (res.status === 401 && token.current) {
      token.current = null;
      setUsername(null);
    }

    return { ok: res.ok, status: res.status, data: data as never };
  }, []);

  const signIn = useCallback<AdminAuth['signIn']>(async (user, password) => {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password })
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success && data.accessToken) {
      token.current = data.accessToken;
      setUsername(data.user?.username || user);
      return { ok: true, message: '' };
    }
    return {
      ok: false,
      // The server distinguishes "not configured" from "wrong password", and
      // those need different actions from whoever is standing at the screen.
      message: data.message || 'Sign in failed.'
    };
  }, []);

  const signOut = useCallback(() => {
    token.current = null;
    setUsername(null);
  }, []);

  const value = useMemo<AdminAuth>(
    () => ({ signedIn: username !== null, username, signIn, signOut, api }),
    [username, signIn, signOut, api]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin(): AdminAuth {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdmin must be used inside AdminAuthProvider');
  return ctx;
}

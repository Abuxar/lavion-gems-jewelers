'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  emailVerified?: boolean;
  providers?: string[];
};

export type ApiResult<T = Record<string, unknown>> = {
  ok: boolean;
  status: number;
  data: T & { success?: boolean; message?: string; code?: string };
};

type AuthState = {
  user: User | null;
  /** 'loading' until the refresh cookie has been given a chance to speak. */
  status: 'loading' | 'authenticated' | 'anonymous';
  api: <T = Record<string, unknown>>(
    path: string,
    init?: { method?: string; body?: unknown }
  ) => Promise<ApiResult<T>>;
  applySession: (accessToken: string, user: User) => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<boolean>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * The session, kept the way the server designed it.
 *
 * The access token lives in memory and nowhere else — deliberately not in
 * localStorage, where any injected script on the page could read it. Durability
 * comes instead from the refresh token, which is an httpOnly cookie the
 * JavaScript here cannot see at all. The cost is that a page reload starts with
 * no access token, which is what the refresh on mount is for.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const token = useRef<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');

  const applySession = useCallback((accessToken: string, nextUser: User) => {
    token.current = accessToken;
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  const clear = useCallback(() => {
    token.current = null;
    setUser(null);
    setStatus('anonymous');
  }, []);

  /** Trade the refresh cookie for a new access token. */
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin'
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data?.accessToken || !data?.user) return false;
      applySession(data.accessToken, data.user);
      return true;
    } catch {
      return false;
    }
  }, [applySession]);

  const api = useCallback(
    async <T,>(path: string, init: { method?: string; body?: unknown } = {}) => {
      const send = async (): Promise<Response> =>
        fetch(path, {
          method: init.method || 'GET',
          credentials: 'same-origin',
          headers: {
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...(token.current ? { Authorization: `Bearer ${token.current}` } : {})
          },
          ...(init.body ? { body: JSON.stringify(init.body) } : {})
        });

      let res = await send();

      /**
       * One retry, and only when a token was actually presented. An access
       * token is short-lived, so a 401 on a signed-in visitor usually means it
       * expired mid-session rather than that they are signed out. Retrying a
       * request that carried no token would just be asking the same
       * unauthenticated question twice.
       */
      if (res.status === 401 && token.current) {
        if (await refresh()) {
          res = await send();
        } else {
          clear();
        }
      }

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        data = { message: 'The server sent something unreadable.' };
      }
      return { ok: res.ok, status: res.status, data } as ApiResult<T>;
    },
    [refresh, clear]
  );

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      clear();
    }
  }, [clear]);

  useEffect(() => {
    let cancelled = false;
    refresh().then(ok => {
      if (!cancelled && !ok) setStatus('anonymous');
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, status, api, applySession, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

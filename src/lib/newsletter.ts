/**
 * Newsletter signup, and the rule about when it is acceptable to ask.
 *
 * The endpoint is the one the footer form has always posted to, so the list,
 * the welcome mail and the unsubscribe tokens are untouched — this adds a
 * second place to sign up, not a second list.
 *
 * The rule matters more than the form. A popup that reappears on every page
 * load is worse than no popup: it trains people to close it before reading it,
 * and it asks visitors who already subscribed to subscribe again. So the answer
 * is remembered, in the visitor's own browser and nowhere else.
 */

const KEY = 'lavion.newsletter';

/**
 * How long "no" lasts. Long enough that a returning visitor is not asked twice
 * in the same month; short enough that someone who dismissed it a season ago
 * and is now browsing seriously can still be offered it.
 */
const DISMISS_DAYS = 30;

type Answer = 'subscribed' | 'dismissed';
type Stored = { state: Answer; at: number };

/**
 * Storage can throw outright — Safari private browsing, a browser set to block
 * site data, an embedded webview. Every access is guarded, and a failure means
 * the popup behaves as it does for a first-time visitor rather than crashing
 * the page around it.
 */
function read(): Stored | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      ((parsed as Stored).state === 'subscribed' || (parsed as Stored).state === 'dismissed')
    ) {
      return parsed as Stored;
    }
  } catch {
    /* unreadable or unparseable — treat as never asked */
  }
  return null;
}

function write(state: Answer) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ state, at: Date.now() }));
  } catch {
    /* If we cannot remember the answer we simply ask again next time. */
  }
}

/** Recorded by the footer form too, so signing up there stops the popup. */
export function markSubscribed() {
  write('subscribed');
}

export function markDismissed() {
  write('dismissed');
}

/** True when this visitor has neither subscribed nor recently said no. */
export function mayAsk(): boolean {
  const stored = read();
  if (!stored) return true;
  if (stored.state === 'subscribed') return false;
  return Date.now() - stored.at > DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export type SignupResult = { ok: boolean; message: string };

export async function subscribe(email: string): Promise<SignupResult> {
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    // The server distinguishes "already on our list" from "thank you for
    // subscribing", and both are successes — its wording is used as given.
    if (data.success) markSubscribed();
    return {
      ok: Boolean(data.success),
      message: data.message || (data.success ? 'Thank you for subscribing.' : 'That address was not accepted.')
    };
  } catch {
    return { ok: false, message: 'We could not reach the server. Please try again.' };
  }
}

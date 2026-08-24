/**
 * Newsletter signup, and the rule about when it is acceptable to ask.
 *
 * The endpoint is the one the footer form has always posted to, so the list,
 * the welcome mail and the unsubscribe tokens are untouched — this adds a
 * second place to sign up, not a second list.
 *
 * The rule matters more than the form, and the two answers are not the same
 * kind of answer, so they are not kept in the same place:
 *
 *   "not now"  -> sessionStorage. Held for this visit only. Close the tab and
 *                 come back tomorrow and the offer is made again.
 *   "yes"      -> localStorage. Held for good. Someone who has joined the list
 *                 must never be asked to join it again, in this session or any
 *                 later one.
 *
 * Keeping a dismissal in localStorage would silence the offer for months after
 * a single idle close; keeping a subscription in sessionStorage would pester
 * the people who actually said yes. Hence one of each.
 */

/** Permanent, and only ever holds the fact of a subscription. */
const SUBSCRIBED_KEY = 'lavion.newsletter';
/** This visit only. Cleared by the browser when the tab closes. */
const DISMISSED_KEY = 'lavion.newsletter.dismissed';

/**
 * Storage can throw outright — Safari private browsing, a browser set to block
 * site data, an embedded webview. Every access is guarded, and a failure means
 * the popup behaves as it does for a first-time visitor rather than crashing
 * the page around it.
 */
function hasSubscribed(): boolean {
  try {
    const raw = window.localStorage.getItem(SUBSCRIBED_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { state?: string }).state === 'subscribed'
    );
  } catch {
    return false;
  }
}

function dismissedThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Recorded by the footer form too, so signing up there stops the popup. */
export function markSubscribed() {
  try {
    window.localStorage.setItem(
      SUBSCRIBED_KEY,
      JSON.stringify({ state: 'subscribed', at: Date.now() })
    );
  } catch {
    /* If we cannot remember it, we ask again next time. */
  }
}

export function markDismissed() {
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    /* Same — a browser that will not store it gets asked again. */
  }
}

/** True when this visitor has neither subscribed nor said no during this visit. */
export function mayAsk(): boolean {
  return !hasSubscribed() && !dismissedThisSession();
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
      message:
        data.message ||
        (data.success ? 'Thank you for subscribing.' : 'That address was not accepted.')
    };
  } catch {
    return { ok: false, message: 'We could not reach the server. Please try again.' };
  }
}

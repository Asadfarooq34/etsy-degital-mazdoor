import { useEffect, useState } from "react";

/**
 * Minimal client-side router for Digital Mazdoor (history API, zero deps).
 *
 * Routes are matched on `window.location.pathname` in App.tsx; this module
 * only provides navigation primitives + the current route. Deep links work
 * because every route is served the same index.html (see public/_redirects).
 */

export interface Route {
  /** Pathname, e.g. "/dashboard/keywords" (no query string, no hash). */
  path: string;
  /** Parsed query string of the current location. */
  search: URLSearchParams;
}

function currentRoute(): Route {
  return {
    path: window.location.pathname,
    search: new URLSearchParams(window.location.search),
  };
}

/** Re-render the subscriber on back/forward and on programmatic navigate(). */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute);
  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener("popstate", onChange);
    window.addEventListener("dm:navigate", onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener("dm:navigate", onChange);
    };
  }, []);
  return route;
}

/**
 * Client-side navigation. Same-origin app paths use pushState (no reload);
 * absolute http(s) URLs fall back to a full navigation.
 */
export function navigate(to: string): void {
  if (/^https?:\/\//i.test(to)) {
    window.location.href = to;
    return;
  }
  window.history.pushState(null, "", to);
  window.dispatchEvent(new Event("dm:navigate"));
  window.scrollTo(0, 0);
}

/**
 * Strict validator for the `?next=` post-login redirect — the open-redirect guard.
 *
 * Accepts ONLY same-origin absolute paths ("/dashboard/keywords", "/privacy",
 * "/dashboard/keywords?q=x"). Rejects everything else: empty values, relative
 * paths, protocol-relative URLs ("//evil.com"), backslash tricks ("/\evil.com"),
 * whitespace/control characters, and malformed percent-encoding (including
 * double-encoded "//" smuggled through URLSearchParams decoding).
 *
 * Returns the safe path, or null when the value must be rejected (caller
 * falls back to "/dashboard").
 */
export function sanitizeNext(raw: string | null): string | null {
  if (!raw) return null;
  let decoded: string;
  try {
    // Decode once more: URLSearchParams.get() already decoded one layer, so a
    // second decode catches double-encoded payloads like "%252f%252fevil.com".
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/")) return null; // relative or empty
  if (decoded.startsWith("//")) return null; // protocol-relative
  if (decoded.includes("\\")) return null; // backslash authority trick
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f\u007f]/.test(decoded)) return null; // header-splitting / smuggling
  return decoded;
}

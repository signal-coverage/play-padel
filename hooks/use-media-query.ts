import * as React from "react";

// jsdom (used by this repo's tests) doesn't implement `matchMedia`'s real
// matching logic, so the snapshot is derived directly from
// `window.innerWidth` against the query's own `max-width` boundary instead
// of trusting `mql.matches` — this mirrors what use-mobile.ts and
// use-should-stack-tab-columns.ts already did before being merged into this
// shared hook, keeping every consumer's existing tests (which stub
// `innerWidth` per-test) passing unchanged. `matchMedia` itself is still
// used for the subscribe side so a real browser re-renders when the
// viewport crosses the boundary.
function getMaxWidthBoundary(query: string): number | null {
  const match = query.match(/max-width:\s*(\d+(?:\.\d+)?)px/);
  return match ? Number(match[1]) : null;
}

function subscribe(query: string, callback: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(query: string) {
  const maxWidth = getMaxWidthBoundary(query);
  if (maxWidth !== null) {
    return window.innerWidth <= maxWidth;
  }
  return window.matchMedia(query).matches;
}

function getServerSnapshot() {
  return false;
}

/**
 * Generic media-query hook: takes a full media query string (e.g.
 * `"(max-width: 767px)"`), not just a breakpoint number, so it stays
 * reusable for any future query need. `useIsMobile` and
 * `useShouldStackTabColumns` are thin, breakpoint-specific wrappers around
 * this.
 */
export function useMediaQuery(query: string): boolean {
  return React.useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => getSnapshot(query),
    getServerSnapshot,
  );
}

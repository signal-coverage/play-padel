"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import type { SystemRole } from "@/providers/auth-provider";
import { CLUB_OPERATIONAL_STATUS_QUERY_KEY } from "./consts";
import type { NavItem } from "./consts";
import { getVisibleNavItems, computeVisibleCount } from "./utils";
import type {
  ClubOperationalStatusResponse,
  OpenTournamentsStatusResponse,
} from "./types";

async function fetchClubOperationalStatus(): Promise<ClubOperationalStatusResponse> {
  const res = await fetch("/api/clubs/mercadopago/operational-status");
  if (!res.ok) {
    throw new Error("Failed to load club operational status");
  }
  return res.json();
}

// Intentionally identical to TournamentsHub/hooks.ts's useOpenTournaments
// query key (same endpoint, same shape) — same TanStack Query dedup
// reasoning as CLUB_OPERATIONAL_STATUS_QUERY_KEY above: when AppNavbar and
// TournamentsHub are both mounted, they share one in-flight request instead
// of firing two. Kept as a local copy, not imported across folders, per
// this repo's SRP-per-folder convention.
const OPEN_TOURNAMENTS_QUERY_KEY = ["tournaments", "open"] as const;

const NEW_BADGE_WINDOW_MS = 48 * 60 * 60 * 1000;

async function fetchOpenTournamentsStatus(): Promise<OpenTournamentsStatusResponse> {
  const res = await fetch("/api/tournaments/open");
  if (!res.ok) {
    throw new Error("Failed to load open tournaments");
  }
  return res.json();
}

export type TournamentsNavBadge = "new" | "open" | null;

// react-hooks/purity forbids calling the impure Date.now() directly during
// render (see react.dev's components-and-hooks-must-be-idempotent rule) —
// same pattern as PaymentReturnView/hooks.ts's local useNow and
// ClosuresList.tsx's inline equivalent: read the clock once via a lazy
// useState initializer (allowed there), then refresh it on an interval so
// the derived "new" -> "open" badge transition still updates for anyone who
// leaves the tab open past the 48h window, without re-reading Date.now()
// synchronously in the render body itself.
const NOW_REFRESH_INTERVAL_MS = 60_000;

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), NOW_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Whether at least one tournament is currently open for registration (or
 * the player has an active team in one — both folded into
 * GET /api/tournaments/open's "any open" result), plus the derived nav
 * badge state: "new" while any open tournament was published within the
 * last 48h, else "open" while any is open at all, else `null`.
 *
 * Only fires for players (`role === "player"`) — this drives the
 * Tournaments nav item, which is player-only (see consts.ts), so an owner
 * session must never trigger this network call.
 */
export function useOpenTournamentsStatus(role: SystemRole): {
  anyOpen: boolean;
  badge: TournamentsNavBadge;
} {
  const { data } = useQuery({
    queryKey: OPEN_TOURNAMENTS_QUERY_KEY,
    queryFn: fetchOpenTournamentsStatus,
    enabled: role === "player",
  });

  const tournaments = data?.tournaments ?? [];
  const anyOpen = tournaments.length > 0;
  const now = useNow();
  const hasRecentlyPublished = tournaments.some(
    (tournament) =>
      tournament.publishedAt != null &&
      now - new Date(tournament.publishedAt).getTime() < NEW_BADGE_WINDOW_MS,
  );

  const badge: TournamentsNavBadge = hasRecentlyPublished
    ? "new"
    : anyOpen
      ? "open"
      : null;

  return { anyOpen, badge };
}

/**
 * Whether the signed-in owner's club is currently operational.
 *
 * Only fires the fetch for owners (`role === "owner"`) — ClubOperationalGate
 * is never mounted for players (see DashboardShell.tsx), so nothing else
 * needs this data for them and a player session must never trigger this
 * network call.
 *
 * Returns `undefined` while the status hasn't resolved yet (or whenever the
 * query is disabled, i.e. for a player). Callers should treat `undefined`
 * the same as `false` (reduced nav, see getVisibleNavItems) — the opposite
 * of ClubOperationalGate's own "fail toward showing more" convention, since
 * assuming operational here would flash owner-only category links that
 * immediately disappear again for any club that turns out non-operational.
 */
export function useIsClubOperational(role: SystemRole): boolean | undefined {
  const { data } = useQuery({
    queryKey: CLUB_OPERATIONAL_STATUS_QUERY_KEY,
    queryFn: fetchClubOperationalStatus,
    enabled: role === "owner",
  });

  return data?.operational;
}

/**
 * The specific reason the caller's own club isn't operational yet, if any —
 * `null` once approved (whether or not it's fully operational for other
 * reasons), `undefined` while unresolved/disabled. Same underlying query as
 * useIsClubOperational (shared by queryKey value, not an extra request) —
 * see UserMenu.tsx's own caller, which needs to tell "still pending
 * approval" apart from every other non-operational cause specifically.
 */
export function useClubOperationalCause(
  role: SystemRole,
): ClubOperationalStatusResponse["cause"] | undefined {
  const { data } = useQuery({
    queryKey: CLUB_OPERATIONAL_STATUS_QUERY_KEY,
    queryFn: fetchClubOperationalStatus,
    enabled: role === "owner",
  });

  return data?.cause;
}

// A nav item plus whether it matches the current route, its resolved badge
// (only ever set for a requiresCondition item, e.g. Tournaments), and
// whether it's visible ONLY via visibleToAdmin widening rather than a real
// role match — the bits of per-item state that are genuinely shared between
// NavLinks and MobileBottomNav (each render list only differs in JSX/
// animation shell).
export type VisibleNavLink = NavItem & {
  active: boolean;
  badge?: "new" | "open";
  // See partitionNavLinks in ./utils — an admin-widened item (the viewer's
  // own `role` isn't in the item's `roles`) always routes into the Admin
  // dropdown, regardless of the item's own `group` tag.
  viaAdminWidening: boolean;
};

/**
 * Shared, non-presentational logic behind both nav renderers
 * (NavLinks/MobileBottomNav): which items are visible for this
 * role/admin/operational-status/dynamic-condition combination (see
 * getVisibleNavItems), plus whether each one matches the current pathname
 * and its resolved badge, if any. Callers only need to map over the result
 * and render their own link/pill/tab shell.
 */
export function useVisibleNavLinks(
  role: SystemRole,
  isAdmin: boolean = false,
): VisibleNavLink[] {
  const pathname = usePathname();
  const isOperational = useIsClubOperational(role);
  const { anyOpen: tournamentsOpen, badge: tournamentsBadge } =
    useOpenTournamentsStatus(role);
  const visibleItems = getVisibleNavItems(role, isOperational, isAdmin, {
    tournamentsOpen,
  });

  return visibleItems.map((item) => ({
    ...item,
    active: pathname === item.href,
    badge:
      item.requiresCondition === "tournamentsOpen" && tournamentsBadge
        ? tournamentsBadge
        : undefined,
    viaAdminWidening: isAdmin && !item.roles.includes(role),
  }));
}

export type OverflowNavHandle = {
  // Every one of these is a plain callback, never a RefObject — this repo's
  // react-hooks/refs lint rule (part of the React Compiler ruleset) refuses
  // to let a ref cross a custom hook's return boundary at all, even a
  // perfectly correct one only ever read in an effect. Call each from an
  // INLINE arrow literal right at the JSX ref= site (e.g.
  // `ref={(el) => overflow.setContainerRef(el)}`) — see NavLinks.tsx's own
  // usage for the exact pattern; never pass one of these functions as
  // `ref=` directly either, only a literal arrow wrapping the call.
  //
  // setContainerRef wraps the dynamically-overflowing items — its measured
  // width is what "available space" means for computeVisibleCount, MINUS
  // whatever setEssentialRef/setAdminTriggerRef below report (see their own
  // comments). Give its element `min-w-0` so CSS flexbox — not this
  // hook — decides how much room these items actually get once any fixed
  // shrink-0 siblings take theirs. Deliberately no `overflow-hidden` here:
  // an open More/Admin dropdown is position: absolute and needs to escape
  // this box to be visible at all (see MobileBottomNav.tsx's own bugfix
  // comment) — jsdom doesn't compute real CSS clipping, so a clipped-but-
  // "open" dropdown is invisible to every test that doesn't specifically
  // check for it. computeVisibleCount's own arithmetic is what keeps this
  // container's actual rendered content from overflowing its bounds in the
  // first place, so nothing needs clipping as a safety net.
  setContainerRef: (el: HTMLDivElement | null) => void;
  // Attaches to a hidden (visibility: hidden, position: absolute — never
  // display: none, which reports 0 width) measurement clone of whichever
  // item at that index is currently overflowed, in the same order as the
  // real, possibly-shorter visible list — the only way to know an
  // overflowed item's width without ever rendering it visibly. A
  // currently-SHOWN item is measured off its own real, visible instance
  // instead (same setter, different call site).
  setItemRef: (index: number, el: HTMLElement | null) => void;
  // Attach to a hidden clone of the "More" trigger itself, so its real
  // rendered width (icon + label + chevron + padding) is measured instead
  // of guessed.
  setMoreTriggerRef: (el: HTMLElement | null) => void;
  // Attach to any always-visible element that ALSO lives inside the same
  // measured container as setContainerRef (rather than as a separate flex
  // sibling outside it) — MobileBottomNav does this for its essential
  // Dashboard tab, so every visible tab (Dashboard, the overflow
  // candidates, Admin) shares one flex row and gets evenly spaced by a
  // single justify-around instead of nested blocks. Its real rendered
  // width is subtracted from the container's own measured width before
  // deciding how many overflow candidates fit — otherwise the arithmetic
  // would think space Dashboard is actually occupying is free for
  // candidates too. A caller that instead keeps the essential item OUTSIDE
  // the measured container (desktop NavLinks) simply never calls this:
  // CSS already excludes that sibling's width from the container's own
  // offsetWidth in that layout, so nothing needs reserving explicitly.
  setEssentialRef: (el: HTMLElement | null) => void;
  // Same idea as setEssentialRef, for the Admin trigger instead of the
  // essential item.
  setAdminTriggerRef: (el: HTMLElement | null) => void;
  // How many of the first `itemCount` items (in order) currently fit —
  // render exactly this many normally; the rest belong in the overflow
  // dropdown.
  visibleCount: number;
};

/**
 * Real-width, real-container responsive overflow: recomputes, on mount and
 * on every resize of the container element, how many of `itemCount` ordered
 * items actually fit — via computeVisibleCount (see ./utils) — using each
 * item's own measured width rather than a fixed CSS breakpoint tied to one
 * specific role/item combination. Continuous by construction: it degrades
 * one item at a time as width shrinks (or grows), for ANY nav shape, not
 * just the cases a breakpoint happened to be tuned for.
 *
 * All refs are created AND consumed entirely inside this hook — nothing
 * ref-shaped is ever returned (see OverflowNavHandle's own comment for why).
 * The container's ResizeObserver is set up/torn down directly inside
 * setContainerRef itself (fired on every mount/unmount of that element,
 * same as a `useEffect` keyed to the DOM node would be) rather than in a
 * separate effect keyed off a RefObject, since there's no RefObject to key
 * one off of anymore.
 *
 * jsdom (this repo's test environment) never lays out real pixels — every
 * measured width is 0, so `total <= availableWidth` is always true and this
 * defaults to "show everything, no overflow" in tests. That's the same
 * graceful, non-crashing default a real browser gives before its first
 * layout pass; genuine overflow behavior is covered by computeVisibleCount's
 * own pure-number unit tests (see utils.test.ts) plus stubbed-offsetWidth
 * integration tests where the real wiring matters (see NavLinks.test.tsx).
 */
export function useOverflowNav(itemCount: number): OverflowNavHandle {
  const containerNodeRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const itemNodesRef = useRef<(HTMLElement | null)[]>([]);
  const moreTriggerNodeRef = useRef<HTMLElement | null>(null);
  const essentialNodeRef = useRef<HTMLElement | null>(null);
  const adminTriggerNodeRef = useRef<HTMLElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(itemCount);

  const recompute = useCallback(() => {
    const container = containerNodeRef.current;
    if (!container) return;
    const widths = itemNodesRef.current
      .slice(0, itemCount)
      .map((node) => node?.offsetWidth ?? 0);
    // Only ever non-zero for a caller that renders the essential item
    // and/or Admin trigger INSIDE this same measured container (see
    // setEssentialRef/setAdminTriggerRef's own comments) — 0 for any
    // unset ref, so a caller (desktop NavLinks) that keeps them as
    // separate outside siblings instead sees no change here at all.
    const reservedWidth =
      (essentialNodeRef.current?.offsetWidth ?? 0) +
      (adminTriggerNodeRef.current?.offsetWidth ?? 0);
    setVisibleCount(
      computeVisibleCount(
        widths,
        Math.max(0, container.offsetWidth - reservedWidth),
        moreTriggerNodeRef.current?.offsetWidth ?? 0,
      ),
    );
  }, [itemCount]);

  // Every candidate item's own width can change across renders (a badge
  // appearing/disappearing, a title changing) even when the container
  // itself doesn't resize — re-measure on every render pass, not just on
  // mount/resize, so those cases stay correct too. useLayoutEffect (not
  // useEffect) so it's reflected before paint, matching DataTable's own
  // ResizeObserver-driven recompute timing.
  useLayoutEffect(() => {
    recompute();
  });

  const setContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      containerNodeRef.current = el;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (el && typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(recompute);
        observer.observe(el);
        resizeObserverRef.current = observer;
      }
    },
    [recompute],
  );

  const setItemRef = useCallback((index: number, el: HTMLElement | null) => {
    itemNodesRef.current[index] = el;
  }, []);

  const setMoreTriggerRef = useCallback((el: HTMLElement | null) => {
    moreTriggerNodeRef.current = el;
  }, []);

  const setEssentialRef = useCallback((el: HTMLElement | null) => {
    essentialNodeRef.current = el;
  }, []);

  const setAdminTriggerRef = useCallback((el: HTMLElement | null) => {
    adminTriggerNodeRef.current = el;
  }, []);

  return {
    setContainerRef,
    setItemRef,
    setMoreTriggerRef,
    setEssentialRef,
    setAdminTriggerRef,
    visibleCount,
  };
}

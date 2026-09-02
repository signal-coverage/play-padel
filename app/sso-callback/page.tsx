"use client";

import { useEffect } from "react";
import { AuthenticateWithRedirectCallback, useAuth } from "@clerk/nextjs";

// `*ForceRedirectUrl`, not `*FallbackRedirectUrl` — verified against the
// installed Clerk SDK's own source (@clerk/shared's `RedirectUrls#
// getRedirectUrl`): its precedence is forceKey -> a `redirect_url` SEARCH
// PARAM -> fallbackKey -> "/". Google's OAuth round-trip lands back here
// carrying its own `redirect_url` (confirmed live: an owner signing in
// with Google ended up on "/" instead of "/dashboard", exactly what
// happens when that search param wins over a `FallbackRedirectUrl` prop
// and doesn't resolve to something real). `force` is checked BEFORE that
// search param, so it wins unconditionally.
//
// Both point at "/dashboard" — same target LoginView/SignupView now
// share, letting DashboardGuard's client-side onboarding check be the ONE
// place that decides, for every auth entry point identically. That
// unification fixed every case reproduced so far EXCEPT one: an already-
// onboarded owner (payment still pending) signing up via Google — the
// component still left the target page stuck mid-render in Next.js dev
// mode (a blank page, Next's own dev overlay stuck on "Rendering", the
// URL never settling), reproduced live even with a single, non-looping
// hop to /dashboard. `AuthenticateWithRedirectCallback`'s own completion
// logic lives in `clerk-js`, loaded from Clerk's CDN at runtime — it
// isn't in node_modules, so its internals aren't inspectable here, and
// that dev-mode client-transition stall can't be diagnosed further from
// this codebase alone.
//
// The `useEffect` below is the actual fix: it doesn't wait on that
// component's own router transition at all. The instant `useAuth()`
// reports a real session, it forces a HARD navigation itself
// (`window.location.replace`, not Next's router) — the same kind of
// navigation an F5 does, which reliably escaped every stuck state
// reproduced so far. `*ForceRedirectUrl` stays below as a harmless
// safety net for whichever of the two navigations (this effect's, or the
// component's own) happens to win the race.
export default function SSOCallbackPage() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      window.location.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn]);

  return (
    <AuthenticateWithRedirectCallback
      signInUrl="/login"
      signUpUrl="/signup"
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
    />
  );
}

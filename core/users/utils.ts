// Zero imports on purpose — this needs to be safely importable from BOTH
// server code (app/page.tsx, app/onboarding/layout.tsx, which read a real
// UserProfile row via core/users/services) and client code (DashboardGuard,
// which reads the client-side AppUser shape from useAuth). Pulling in
// core/users/services here would drag prisma into DashboardGuard's client
// bundle.
//
// Single source of truth every "does this account still need onboarding?"
// check must share. A previous divergence — app/onboarding/layout.tsx
// treating "a UserProfile row exists at all" as done, while DashboardGuard
// separately required "role is set, and if owner, clubId is set" — let an
// owner stuck between "started club creation" and "finished club
// creation" bounce forever between /dashboard and /onboarding, each page
// disagreeing with the other about whether they were done. Reproduced
// live via a real Google sign-in (a blank "/" that never settled, per
// Next.js's own dev overlay showing it stuck mid-render — an infinite
// server-side redirect loop, not a hang).
export function hasCompletedOnboarding(
  profile:
    | { role: string | null | undefined; clubId?: string | null }
    | null
    | undefined,
): boolean {
  if (!profile || !profile.role) return false;
  if (profile.role === "owner" && !profile.clubId) return false;
  return true;
}

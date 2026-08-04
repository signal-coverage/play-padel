"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";

// Mirrors prisma/schema.prisma's SystemRole enum.
export type SystemRole = "owner" | "player";

interface UserProfileSummary {
  role: SystemRole;
  clubId: string | null;
  padelCategory: number | null;
}

export interface AppUser {
  id: string;
  email: string | null;
  displayName: string | null;
  imageUrl: string | null;
  // null until the /api/me lookup resolves, or if no UserProfile row exists
  // yet for this Clerk user (nobody creates one until core/clubs/core/users
  // land — see DashboardGuard for how that gap is currently handled).
  role: SystemRole | null;
  clubId: string | null;
  // Player-only self-reported skill level (1 = highest, 8 = beginner);
  // always null for owners and for players who skipped it during onboarding.
  padelCategory: number | null;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  // Whether the UserProfile (role/clubId) lookup is still in flight. Distinct
  // from `loading`, which only tracks Clerk's own hydration.
  profileLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  // Tracks the in-flight /api/me fetch only for the "clerkUser present"
  // case. The logged-out/not-yet-hydrated case is derived below instead of
  // being written here, so this never needs a synchronous setState in the
  // effect's early-return branch.
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    // No clerkUser (still hydrating, or logged out) means there's nothing to
    // fetch. `profileLoading` below is derived to `false` for the logged-out
    // case directly during render, so this effect just skips scheduling —
    // no setState needed for that branch.
    if (!isLoaded || !clerkUser) return;

    let cancelled = false;
    // Kicks off the /api/me fetch and tracks its loading state — the
    // recognized "start fetching, subscribe to its result" effect pattern,
    // not a response to a state change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileLoading(true);

    // Thin lookup of this user's own UserProfile.role/clubId. Reads Prisma
    // directly (see app/api/me/route.ts) rather than going through
    // core/users, which is mid-migration to the new owner|player enum.
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : { profile: null }))
      .then((data) => {
        if (!cancelled) setProfile(data?.profile ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, clerkUser?.id]);

  const user = useMemo<AppUser | null>(
    () =>
      clerkUser
        ? {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
            displayName: clerkUser.fullName,
            imageUrl: clerkUser.imageUrl ?? null,
            role: profile?.role ?? null,
            clubId: profile?.clubId ?? null,
            padelCategory: profile?.padelCategory ?? null,
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      clerkUser?.id,
      clerkUser?.primaryEmailAddress?.emailAddress,
      clerkUser?.fullName,
      clerkUser?.imageUrl,
      profile,
    ],
  );

  // Mirrors the old effect-driven value exactly: still hydrating -> true;
  // hydrated with no clerkUser (logged out) -> false; hydrated with a
  // clerkUser -> whatever the in-flight fetch state is.
  const isProfileLoading = !isLoaded
    ? true
    : clerkUser
      ? profileLoading
      : false;

  const value = useMemo(
    () => ({
      user: isLoaded ? user : null,
      loading: !isLoaded,
      profileLoading: isProfileLoading,
      signOut: () => signOut(),
    }),
    [user, isLoaded, isProfileLoading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };

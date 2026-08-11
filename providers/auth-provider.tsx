"use client";

import { createContext, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import type { DominantHand, PreferredSide } from "@/core/users/types";

// Mirrors prisma/schema.prisma's SystemRole enum.
export type SystemRole = "owner" | "player";

interface UserProfileSummary {
  role: SystemRole;
  clubId: string | null;
  padelCategory: number | null;
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
  // Raw ISO string as returned by JSON — parsed into a Date on AppUser.
  createdAt: string;
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
  // Player-only play-style fields, editable from the Player Overview card.
  // Always null for owners and for players who haven't set them yet.
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
  // When this UserProfile row was created — null until the profile lookup
  // resolves, same as every other profile-derived field here.
  createdAt: Date | null;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  // Whether the UserProfile (role/clubId) lookup is still in flight. Distinct
  // from `loading`, which only tracks Clerk's own hydration.
  profileLoading: boolean;
  signOut: () => Promise<void>;
  // Re-runs the /api/me lookup and updates `user` in place — call after any
  // mutation that changes the caller's own UserProfile (e.g. editing
  // preferredSide/dominantHand) so the new value shows up everywhere
  // without a full page reload.
  refetchProfile: () => Promise<void>;
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

  const latestRequestRef = useRef(0);

  // Thin lookup of this user's own UserProfile fields. Reads Prisma
  // directly (see app/api/me/route.ts) rather than going through
  // core/users, which is mid-migration to the new owner|player enum.
  // Guards against out-of-order responses: if a newer call to
  // fetchProfile starts before this one resolves, this one's result is
  // discarded so a stale response can never overwrite fresher state.
  const fetchProfile = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    try {
      const res = await fetch("/api/me");
      const data = res.ok ? await res.json() : { profile: null };
      if (latestRequestRef.current === requestId) {
        setProfile(data?.profile ?? null);
      }
    } catch {
      if (latestRequestRef.current === requestId) {
        setProfile(null);
      }
    }
  }, []);

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

    fetchProfile().finally(() => {
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
            preferredSide: profile?.preferredSide ?? null,
            dominantHand: profile?.dominantHand ?? null,
            createdAt: profile?.createdAt ? new Date(profile.createdAt) : null,
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
      refetchProfile: fetchProfile,
    }),
    [user, isLoaded, isProfileLoading, signOut, fetchProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };

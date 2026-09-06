"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
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
  // Additive admin flag (see prisma/schema.prisma's UserProfile.isAdmin) —
  // optional here since older cached responses / test fixtures may omit it;
  // AppUser below always normalizes it to a real boolean.
  isAdmin?: boolean;
  // Raw ISO string as returned by JSON — parsed into a Date on AppUser.
  createdAt: string;
}

export interface AppUser {
  id: string;
  email: string | null;
  displayName: string | null;
  imageUrl: string | null;
  firstName: string | null;
  lastName: string | null;
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
  // Additive, independent of `role` (see prisma/schema.prisma's
  // UserProfile.isAdmin) — a "player" can also be an admin. Gates new
  // admin-only /dashboard surfaces; unrelated to lib/auth/admin.ts's
  // separate Clerk-metadata-based isAdminUser() check. Defaults to false
  // until the profile lookup resolves.
  isAdmin: boolean;
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
  //
  // Retries a non-401 failure a few times before giving up: reproduced
  // live, a single transient /api/me miss (a dev-server cold-start 404 on
  // the route itself, right after `npm run dev`) used to be coerced into
  // "profile: null" permanently — this effect only ever runs once per
  // `clerkUser.id` (see below), so nothing ever asked again. For an
  // already-onboarded owner, that silently disagreed forever with
  // OnboardingLayout's server-side check (reads Prisma directly, unaffected
  // by this), which kept correctly bouncing them back to /dashboard —
  // an infinite /dashboard <-> /onboarding loop with only one /api/me call
  // ever logged. A 401 is excluded: it's an authoritative "not
  // authenticated" answer, not a transient hiccup, so retrying it would
  // only waste time before landing on the same result.
  const fetchProfile = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          if (latestRequestRef.current === requestId) {
            setProfile(data?.profile ?? null);
          }
          return;
        }
        if (res.status === 401) break;
      } catch {
        // Network error — fall through to retry.
      }

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 150));
      }
    }

    if (latestRequestRef.current === requestId) {
      setProfile(null);
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
            firstName: clerkUser.firstName ?? null,
            lastName: clerkUser.lastName ?? null,
            role: profile?.role ?? null,
            clubId: profile?.clubId ?? null,
            padelCategory: profile?.padelCategory ?? null,
            preferredSide: profile?.preferredSide ?? null,
            dominantHand: profile?.dominantHand ?? null,
            isAdmin: profile?.isAdmin ?? false,
            createdAt: profile?.createdAt ? new Date(profile.createdAt) : null,
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      clerkUser?.id,
      clerkUser?.primaryEmailAddress?.emailAddress,
      clerkUser?.fullName,
      clerkUser?.imageUrl,
      clerkUser?.firstName,
      clerkUser?.lastName,
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

"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";

// Mirrors prisma/schema.prisma's SystemRole enum.
export type SystemRole = "owner" | "player";

interface UserProfileSummary {
  role: SystemRole;
  clubId: string | null;
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
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!clerkUser) {
      // `user` below already collapses to null whenever there's no
      // clerkUser, so a stale `profile` from a previous session is never
      // exposed — just stop showing a loading state.
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
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

  const value = useMemo(
    () => ({
      user: isLoaded ? user : null,
      loading: !isLoaded,
      profileLoading,
      signOut: () => signOut(),
    }),
    [user, isLoaded, profileLoading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };

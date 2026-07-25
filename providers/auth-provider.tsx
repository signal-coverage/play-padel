"use client";

import { createContext, useMemo } from "react";
import { useUser, useClerk } from "@clerk/nextjs";

export interface AppUser {
  id: string;
  email: string | null;
  displayName: string | null;
  imageUrl: string | null;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();

  const user = useMemo<AppUser | null>(
    () =>
      clerkUser
        ? {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
            displayName: clerkUser.fullName,
            imageUrl: clerkUser.imageUrl ?? null,
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      clerkUser?.id,
      clerkUser?.primaryEmailAddress?.emailAddress,
      clerkUser?.fullName,
      clerkUser?.imageUrl,
    ],
  );

  const value = useMemo(
    () => ({
      user: isLoaded ? user : null,
      loading: !isLoaded,
      signOut: () => signOut(),
    }),
    [user, isLoaded, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };

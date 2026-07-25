"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getUserProfile } from "@/app/actions/users";
import { getOrganization } from "@/app/actions/organizations";
import type { Organization } from "@/core/organizations/types";
import type { UserProfile } from "@/core/users/types";

interface OrgContextValue {
  organization: Organization | null;
  userProfile: UserProfile | null;
  loading: boolean;
  needsOnboarding: boolean;
  refetch: () => void;
}

export const OrgContext = createContext<OrgContextValue | null>(null);

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const profileResult = await getUserProfile(user.id);
      if (!profileResult.success || !profileResult.data) {
        setNeedsOnboarding(true);
        return;
      }
      const profile = profileResult.data;
      setUserProfile(profile);
      const orgResult = await getOrganization(profile.organizationId);
      if (orgResult.success) {
        setOrganization(orgResult.data);
      }
      setNeedsOnboarding(false);
    } catch (err) {
      console.error("[OrganizationProvider] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <OrgContext.Provider
      value={{
        organization,
        userProfile,
        loading,
        needsOnboarding,
        refetch: load,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

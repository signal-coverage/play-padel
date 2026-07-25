"use client";

import { useCallback } from "react";
import { useOrganization } from "@/core/organizations/hooks/use-organization";
import { usePlugins } from "@/providers/plugin-provider";
import { checkPermission } from "@/core/permissions/utils";
import type { PermissionKey } from "@/core/permissions/types";

export function usePermission() {
  const { userProfile, loading } = useOrganization();
  const { pluginPermissions } = usePlugins();

  const hasPermission = useCallback(
    (permission: PermissionKey): boolean => {
      if (loading || !userProfile) return false;
      // Custom role: use effectivePermissions (from DB) directly
      if (userProfile.effectivePermissions !== undefined) {
        return (
          userProfile.effectivePermissions.includes(permission as string) ||
          (pluginPermissions as string[]).includes(permission as string)
        );
      }
      // System role: check role-based perms, then additive plugin perms
      return (
        checkPermission(userProfile.roleId, permission) ||
        (pluginPermissions as string[]).includes(permission as string)
      );
    },
    [userProfile, loading, pluginPermissions],
  );

  return { hasPermission };
}

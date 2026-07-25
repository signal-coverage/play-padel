import { ROLE_PERMISSIONS } from "@/core/permissions/permissions";
import type { PermissionKey } from "@/core/permissions/types";

export function checkPermission(
  roleId: string,
  permission: PermissionKey,
  effectivePermissions?: string[],
): boolean {
  if (effectivePermissions !== undefined) {
    return effectivePermissions.includes(permission as string);
  }
  const corePerms =
    ROLE_PERMISSIONS[roleId as keyof typeof ROLE_PERMISSIONS] ?? [];
  return (corePerms as string[]).includes(permission as string);
}

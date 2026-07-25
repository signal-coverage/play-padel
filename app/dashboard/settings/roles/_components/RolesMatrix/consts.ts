import { ROLE_PERMISSIONS } from "@/core/permissions/permissions";
import type { SystemRole } from "@/core/users/types";
import type { PermissionKey } from "@/core/permissions/types";

export const ROLES: SystemRole[] = ["admin", "staff", "professional"];

function groupPermissions(
  allPermissions: PermissionKey[],
): Record<string, PermissionKey[]> {
  const groups: Record<string, PermissionKey[]> = {};
  for (const perm of allPermissions) {
    const module = perm.split(".")[0];
    if (!groups[module]) groups[module] = [];
    groups[module].push(perm);
  }
  return groups;
}

export const ALL_PERMISSIONS: PermissionKey[] = Array.from(
  new Set(Object.values(ROLE_PERMISSIONS).flatMap((perms) => perms)),
) as PermissionKey[];

export const PERMISSION_GROUPS = groupPermissions(ALL_PERMISSIONS);

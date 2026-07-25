"use server";

import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import { checkPermission } from "@/core/permissions/utils";
import { listAuditLogs } from "@/core/audit/services/audit.service";
import type { AuditFilters, AuditLog } from "@/core/audit/types";
import type { ActionResult } from "@/core/billing/types";

export async function getAuditLogs(
  filters: AuditFilters = {},
): Promise<ActionResult<{ logs: AuditLog[]; total: number }>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "settings.manage",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const result = await listAuditLogs(profile.organizationId, filters);
    return {
      success: true,
      data: result as { logs: AuditLog[]; total: number },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

"use server";

import { checkPermission } from "@/core/permissions/utils";
import { listNotifications as _listNotifications } from "@/core/notifications/services/notifications.service";
import type {
  NotificationFilters,
  PaginatedNotifications,
} from "@/core/notifications/services/notifications.service";
import type { ActionResult } from "@/core/billing/types";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";

export async function listNotifications(
  filters?: NotificationFilters,
  page?: number,
  pageSize?: number,
): Promise<ActionResult<PaginatedNotifications>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "notifications.read")) {
      return { success: false, error: "Forbidden" };
    }
    const data = await _listNotifications(
      profile.organizationId,
      filters ?? {},
      page ?? 1,
      pageSize ?? 20,
    );
    return { success: true, data };
  } catch (error) {
    console.error("listNotifications error:", error);
    return { success: false, error: "Failed to fetch notifications" };
  }
}

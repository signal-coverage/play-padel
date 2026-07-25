"use server";

import { prisma } from "@/infrastructure/db/client";
import { checkPermission } from "@/core/permissions/utils";
import {
  installPlugin as _installPlugin,
  enablePlugin as _enablePlugin,
  disablePlugin as _disablePlugin,
  uninstallPlugin as _uninstallPlugin,
  getInstalledPlugins as _getInstalledPlugins,
} from "@/core/plugins/services/plugins.service";
import { PLUGIN_REGISTRY } from "@/plugins";
import type { PluginRegistryEntry } from "@/core/plugins/types";
import type { ActionResult } from "@/core/billing/types";
import type { SystemRole } from "@/core/users/types";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import { logAudit } from "@/core/audit/services/audit.service";

export async function getInstalledPlugins(): Promise<
  ActionResult<PluginRegistryEntry[]>
> {
  try {
    const profile = await requireOrgProfile();
    const data = await _getInstalledPlugins(profile.organizationId);
    return { success: true, data };
  } catch (error) {
    console.error("getInstalledPlugins error:", error);
    return { success: false, error: "Failed to fetch installed plugins" };
  }
}

export async function installPlugin(
  pluginId: string,
): Promise<ActionResult<void>> {
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
    if (!PLUGIN_REGISTRY[pluginId]) {
      return { success: false, error: `Plugin "${pluginId}" not found` };
    }
    const manifest = PLUGIN_REGISTRY[pluginId]!;
    await _installPlugin(
      profile.organizationId,
      pluginId,
      manifest.version,
      profile.id,
    );
    return { success: true, data: undefined };
  } catch (error: unknown) {
    console.error("installPlugin error:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return { success: false, error: "Plugin is already installed" };
    }
    const message =
      error instanceof Error ? error.message : "Failed to install plugin";
    return {
      success: false,
      error:
        process.env.NODE_ENV === "development"
          ? message
          : "Failed to install plugin",
    };
  }
}

export async function enablePlugin(
  pluginId: string,
): Promise<ActionResult<void>> {
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
    if (!PLUGIN_REGISTRY[pluginId]) {
      return { success: false, error: `Plugin "${pluginId}" not found` };
    }
    await _enablePlugin(profile.organizationId, pluginId);
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "plugin.installed",
      entity: "plugin",
      entityId: pluginId,
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("enablePlugin error:", error);
    return { success: false, error: "Failed to enable plugin" };
  }
}

export async function disablePlugin(
  pluginId: string,
): Promise<ActionResult<void>> {
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
    if (!PLUGIN_REGISTRY[pluginId]) {
      return { success: false, error: `Plugin "${pluginId}" not found` };
    }
    await _disablePlugin(profile.organizationId, pluginId);
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "plugin.uninstalled",
      entity: "plugin",
      entityId: pluginId,
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("disablePlugin error:", error);
    return { success: false, error: "Failed to disable plugin" };
  }
}

export async function getMyProfileContext(): Promise<
  ActionResult<{ roleId: SystemRole; specialties: string[] }>
> {
  try {
    const profile = await requireOrgProfile();

    let specialties: string[] = [];
    if (profile.roleId === "professional") {
      const professional = await prisma.professional.findFirst({
        where: { userId: profile.id, organizationId: profile.organizationId },
        select: { specialties: true },
      });
      specialties = professional?.specialties ?? [];
    }

    return {
      success: true,
      data: { roleId: profile.roleId as SystemRole, specialties },
    };
  } catch (error) {
    console.error("getMyProfileContext error:", error);
    return { success: false, error: "Failed to fetch profile context" };
  }
}

export async function uninstallPlugin(
  pluginId: string,
): Promise<ActionResult<void>> {
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
    if (!PLUGIN_REGISTRY[pluginId]) {
      return { success: false, error: `Plugin "${pluginId}" not found` };
    }
    await _uninstallPlugin(profile.organizationId, pluginId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("uninstallPlugin error:", error);
    return { success: false, error: "Failed to uninstall plugin" };
  }
}

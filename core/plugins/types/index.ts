import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { CorePermissionKey } from "@/core/permissions/types";

export interface PluginWidget {
  id: string;
  title: string;
  description?: string;
  requiredPermission?: string;
  component: ComponentType<{ organizationId: string }>;
}

export interface PluginNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  navigation: PluginNavItem[];
  permissions: string[];
  requiredPermissions: CorePermissionKey[];
  widgets?: PluginWidget[];
}

export interface PluginRegistryEntry {
  id: string;
  organizationId: string;
  pluginId: string;
  version: string;
  enabled: boolean;
  installedAt: Date;
  installedBy: string;
  config: Record<string, unknown>;
}

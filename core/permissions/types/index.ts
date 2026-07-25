import type { SystemRole } from "@/core/users/types";

export type CorePermissionKey =
  | "patients.read"
  | "patients.create"
  | "patients.update"
  | "patients.delete"
  | "professionals.read"
  | "professionals.create"
  | "professionals.update"
  | "professionals.delete"
  | "appointments.read"
  | "appointments.create"
  | "appointments.update"
  | "appointments.cancel"
  | "billing.read"
  | "billing.create"
  | "billing.update"
  | "users.read"
  | "users.invite"
  | "users.update"
  | "users.delete"
  | "organization.read"
  | "organization.update"
  | "settings.manage"
  | "notifications.read"
  | "odontology.view"
  | "odontology.write"
  | "odontology.delete"
  | "nutrition.view"
  | "nutrition.write"
  | "nutrition.delete"
  | "psychology.view"
  | "psychology.write"
  | "psychology.delete";

export type PluginPermissionKey = string & {};
export type PermissionKey = CorePermissionKey | PluginPermissionKey;

export interface RolePermissions {
  roleId: SystemRole;
  permissions: PermissionKey[];
}

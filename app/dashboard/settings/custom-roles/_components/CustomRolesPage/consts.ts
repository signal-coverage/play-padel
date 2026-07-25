import type { CorePermissionKey } from "@/core/permissions/types";

export const PERMISSION_LABELS: Record<CorePermissionKey, string> = {
  "patients.read": "View patients",
  "patients.create": "Create patients",
  "patients.update": "Edit patients",
  "patients.delete": "Delete patients",
  "professionals.read": "View professionals",
  "professionals.create": "Create professionals",
  "professionals.update": "Edit professionals",
  "professionals.delete": "Deactivate professionals",
  "appointments.read": "View appointments",
  "appointments.create": "Create appointments",
  "appointments.update": "Edit appointments",
  "appointments.cancel": "Cancel appointments",
  "billing.read": "View billing",
  "billing.create": "Create invoices",
  "billing.update": "Edit/issue invoices",
  "users.read": "View users",
  "users.invite": "Invite users",
  "users.update": "Edit users",
  "users.delete": "Delete users",
  "organization.read": "View organization",
  "organization.update": "Edit organization",
  "settings.manage": "Manage settings",
  "notifications.read": "View notifications",
  "odontology.view": "View odontology",
  "odontology.write": "Edit odontology",
  "odontology.delete": "Delete odontology records",
  "nutrition.view": "View nutrition",
  "nutrition.write": "Edit nutrition",
  "nutrition.delete": "Delete nutrition records",
  "psychology.view": "View psychology",
  "psychology.write": "Edit psychology",
  "psychology.delete": "Delete psychology records",
};

export const PERMISSION_GROUPS: Array<{
  label: string;
  permissions: CorePermissionKey[];
}> = [
  {
    label: "Patients",
    permissions: [
      "patients.read",
      "patients.create",
      "patients.update",
      "patients.delete",
    ],
  },
  {
    label: "Professionals",
    permissions: [
      "professionals.read",
      "professionals.create",
      "professionals.update",
      "professionals.delete",
    ],
  },
  {
    label: "Appointments",
    permissions: [
      "appointments.read",
      "appointments.create",
      "appointments.update",
      "appointments.cancel",
    ],
  },
  {
    label: "Billing",
    permissions: ["billing.read", "billing.create", "billing.update"],
  },
  {
    label: "Users",
    permissions: ["users.read", "users.invite", "users.update", "users.delete"],
  },
  {
    label: "Organization",
    permissions: ["organization.read", "organization.update"],
  },
  {
    label: "Settings",
    permissions: ["settings.manage", "notifications.read"],
  },
  {
    label: "Odontology",
    permissions: ["odontology.view", "odontology.write", "odontology.delete"],
  },
  {
    label: "Nutrition",
    permissions: ["nutrition.view", "nutrition.write", "nutrition.delete"],
  },
  {
    label: "Psychology",
    permissions: ["psychology.view", "psychology.write", "psychology.delete"],
  },
];

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "patient.created": "Patient Created",
  "patient.updated": "Patient Updated",
  "patient.deleted": "Patient Deleted",
  "appointment.created": "Appointment Created",
  "appointment.updated": "Appointment Updated",
  "appointment.cancelled": "Appointment Cancelled",
  "appointment.completed": "Appointment Completed",
  "appointment.no_show": "Appointment No Show",
  "invoice.created": "Invoice Created",
  "invoice.issued": "Invoice Issued",
  "invoice.voided": "Invoice Voided",
  "invoice.paid": "Invoice Paid",
  "professional.created": "Professional Created",
  "professional.updated": "Professional Updated",
  "professional.deactivated": "Professional Deactivated",
  "user.invited": "User Invited",
  "user.updated": "User Updated",
  "user.deleted": "User Deleted",
  "organization.updated": "Organization Updated",
  "organization.plan_changed": "Plan Changed",
  "plugin.installed": "Plugin Installed",
  "plugin.uninstalled": "Plugin Uninstalled",
};

export const AUDIT_ENTITY_OPTIONS = [
  "patient",
  "appointment",
  "invoice",
  "professional",
  "user",
  "plugin",
  "organization",
];

export const ENTITY_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "__all__", label: "All entities" },
  ...AUDIT_ENTITY_OPTIONS.map((entity) => ({
    value: entity,
    label: entity.charAt(0).toUpperCase() + entity.slice(1),
  })),
];

export const ACTION_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "__all__", label: "All actions" },
  ...Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

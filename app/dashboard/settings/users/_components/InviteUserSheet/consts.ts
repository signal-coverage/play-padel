import type { SystemRole } from "@/core/users/types";

export const ROLE_OPTIONS: { value: SystemRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "professional", label: "Professional" },
];

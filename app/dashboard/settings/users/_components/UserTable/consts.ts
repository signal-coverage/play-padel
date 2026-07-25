import type { SystemRole, UserStatus } from "@/core/users/types";

export const STATUS_VARIANT: Record<
  UserStatus,
  "default" | "secondary" | "outline"
> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  PENDING: "outline",
};

export const ROLE_OPTIONS: { value: SystemRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "professional", label: "Professional" },
];

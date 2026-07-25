import type { SystemRole } from "@/core/users/types";

export const ROLE_VARIANT: Record<
  SystemRole,
  "default" | "secondary" | "outline"
> = {
  admin: "default",
  staff: "secondary",
  professional: "outline",
};

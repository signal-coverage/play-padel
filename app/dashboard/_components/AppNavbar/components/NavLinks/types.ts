import type { SystemRole } from "@/providers/auth-provider";

export type NavLinksProps = {
  role: SystemRole;
  // Gates `adminOnly` nav items (e.g. Audit Log) independent of `role`.
  // Defaults to false so existing call sites that predate this flag keep
  // their prior (admin-item-hidden) behavior.
  isAdmin?: boolean;
  className?: string;
};

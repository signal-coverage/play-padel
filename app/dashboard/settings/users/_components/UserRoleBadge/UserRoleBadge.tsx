import { Badge } from "@/components/ui/badge";
import type { SystemRole } from "@/core/users/types";
import { ROLE_LABEL } from "@/core/users/consts";
import { ROLE_VARIANT } from "./consts";

interface UserRoleBadgeProps {
  role: SystemRole;
}

export function UserRoleBadge({ role }: UserRoleBadgeProps) {
  return (
    <Badge variant={ROLE_VARIANT[role] ?? "secondary"}>
      {ROLE_LABEL[role] ?? role}
    </Badge>
  );
}

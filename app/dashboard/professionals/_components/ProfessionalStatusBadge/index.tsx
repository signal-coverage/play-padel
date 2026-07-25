"use client";

import { Badge } from "@/components/ui/badge";
import type { ProfessionalStatusBadgeProps } from "./types";

export function ProfessionalStatusBadge({
  active,
}: ProfessionalStatusBadgeProps) {
  return (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import type { AppointmentStatusBadgeProps } from "./types";
import { STATUS_CONFIG } from "./consts";

export function AppointmentStatusBadge({
  status,
}: AppointmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  if (status === "CANCELLED") {
    return <Badge variant="destructive">{config.label}</Badge>;
  }
  if (status === "COMPLETED") {
    return <Badge variant="default">{config.label}</Badge>;
  }

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

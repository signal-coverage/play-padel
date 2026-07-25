import { Badge } from "@/components/ui/badge";
import type { PatientStatus } from "@/core/patients/types";
import { PATIENT_STATUS_LABEL } from "@/core/patients/consts";
import { STATUS_BADGE_VARIANT } from "./consts";

interface PatientStatusBadgeProps {
  status: PatientStatus;
}

export function PatientStatusBadge({ status }: PatientStatusBadgeProps) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]}>
      {PATIENT_STATUS_LABEL[status]}
    </Badge>
  );
}

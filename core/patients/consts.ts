import type { PatientStatus } from "@/core/patients/types";

export const PATIENT_STATUS_LABEL: Record<PatientStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

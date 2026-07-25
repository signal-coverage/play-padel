import type { PatientStatus } from "@/core/patients/types";

export const STATUS_FILTER_OPTIONS: {
  value: PatientStatus | "ALL";
  label: string;
}[] = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
];

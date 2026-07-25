import type { Patient } from "@/core/patients/types";

export interface PatientTableProps {
  patients: Patient[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

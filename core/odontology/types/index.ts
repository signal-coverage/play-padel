export type TreatmentStatus =
  "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface Treatment {
  id: string;
  organizationId: string;
  patientId: string;
  professionalId?: string | null;
  consultationId?: string | null;
  toothNumber?: number | null;
  surface?: string | null;
  description: string;
  status: TreatmentStatus;
  price?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

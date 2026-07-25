export type NutritionPlanStatus = "ACTIVE" | "COMPLETED" | "SUSPENDED";

export interface NutritionPlan {
  id: string;
  organizationId: string;
  patientId: string;
  professionalId?: string | null;
  title: string;
  caloricTarget?: number | null;
  proteinTarget?: number | null;
  carbTarget?: number | null;
  fatTarget?: number | null;
  notes?: string | null;
  startDate: Date;
  status: NutritionPlanStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface NutritionSession {
  id: string;
  organizationId: string;
  patientId: string;
  planId?: string | null;
  appointmentId?: string | null;
  professionalId?: string | null;
  weight?: number | null;
  bmi?: number | null;
  chiefComplaint?: string | null;
  observations?: string | null;
  dietaryChanges?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

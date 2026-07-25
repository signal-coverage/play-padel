import type {
  NutritionPlanRecord,
  NutritionSessionRecord,
} from "@/app/actions/nutrition";

export interface NutritionPatientChartProps {
  patientId: string;
  initialPlans: NutritionPlanRecord[];
  initialSessions: NutritionSessionRecord[];
  onRefresh: () => void;
}

export interface SessionFormState {
  planId: string;
  weight: string;
  bmi: string;
  chiefComplaint: string;
  observations: string;
  dietaryChanges: string;
}

export interface PlanFormState {
  title: string;
  caloricTarget: string;
  proteinTarget: string;
  carbTarget: string;
  fatTarget: string;
  notes: string;
  startDate: string;
}

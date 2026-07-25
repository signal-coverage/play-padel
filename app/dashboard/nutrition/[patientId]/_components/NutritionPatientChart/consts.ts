import type { SessionFormState, PlanFormState } from "./types";

export const EMPTY_SESSION_FORM: SessionFormState = {
  planId: "",
  weight: "",
  bmi: "",
  chiefComplaint: "",
  observations: "",
  dietaryChanges: "",
};

export const EMPTY_PLAN_FORM: PlanFormState = {
  title: "",
  caloricTarget: "",
  proteinTarget: "",
  carbTarget: "",
  fatTarget: "",
  notes: "",
  startDate: new Date().toISOString().split("T")[0],
};

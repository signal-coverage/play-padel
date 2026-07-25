import type { SessionFormState, GoalFormState } from "./types";
import type {
  SessionType,
  RiskLevel,
  GoalStatus,
} from "@/core/psychology/types";

export const EMPTY_SESSION_FORM: SessionFormState = {
  sessionType: "INDIVIDUAL",
  moodRating: "",
  anxietyLevel: "",
  riskAssessment: "LOW",
  chiefComplaint: "",
  sessionNotes: "",
  therapeuticApproach: "",
  homeworkAssigned: "",
  nextSessionGoals: "",
};

export const EMPTY_GOAL_FORM: GoalFormState = {
  description: "",
  targetDate: "",
  progress: "",
};

export const SESSION_TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "GROUP", label: "Group" },
  { value: "COUPLE", label: "Couple" },
  { value: "FAMILY", label: "Family" },
];

export const RISK_LEVEL_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export const GOAL_STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "ACHIEVED", label: "Achieved" },
  { value: "ABANDONED", label: "Abandoned" },
];

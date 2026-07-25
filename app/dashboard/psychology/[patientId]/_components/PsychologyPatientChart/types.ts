import type {
  PsychologySessionRecord,
  PsychologyGoalRecord,
} from "@/app/actions/psychology";

export interface PsychologyPatientChartProps {
  patientId: string;
  initialSessions: PsychologySessionRecord[];
  initialGoals: PsychologyGoalRecord[];
  onRefresh: () => void;
}

export interface SessionFormState {
  sessionType: string;
  moodRating: string;
  anxietyLevel: string;
  riskAssessment: string;
  chiefComplaint: string;
  sessionNotes: string;
  therapeuticApproach: string;
  homeworkAssigned: string;
  nextSessionGoals: string;
}

export interface GoalFormState {
  description: string;
  targetDate: string;
  progress: string;
}

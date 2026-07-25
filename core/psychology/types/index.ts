export type SessionType = "INDIVIDUAL" | "GROUP" | "COUPLE" | "FAMILY";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type GoalStatus = "ACTIVE" | "ACHIEVED" | "ABANDONED";

export interface PsychologySession {
  id: string;
  organizationId: string;
  patientId: string;
  professionalId?: string | null;
  appointmentId?: string | null;
  sessionType: SessionType;
  moodRating?: number | null;
  anxietyLevel?: number | null;
  chiefComplaint?: string | null;
  sessionNotes?: string | null;
  therapeuticApproach?: string | null;
  homeworkAssigned?: string | null;
  riskAssessment?: RiskLevel | null;
  nextSessionGoals?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface PsychologyGoal {
  id: string;
  organizationId: string;
  patientId: string;
  description: string;
  targetDate?: Date | null;
  status: GoalStatus;
  progress?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

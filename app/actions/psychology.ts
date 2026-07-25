"use server";

import { checkPermission } from "@/core/permissions/utils";
import type { ActionResult } from "@/core/billing/types";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import {
  getPatientPsychologyChart as getChartService,
  createPsychologySession as createSessionService,
  updatePsychologySession as updateSessionService,
  deletePsychologySession as deleteSessionService,
  createPsychologyGoal as createGoalService,
  updatePsychologyGoal as updateGoalService,
  deletePsychologyGoal as deleteGoalService,
  getPsychologyStats as getStatsService,
  getRecentPsychologyPatients as getRecentPatientsService,
} from "@/core/psychology/services/psychology.service";
import type {
  SessionType,
  RiskLevel,
  GoalStatus,
} from "@/core/psychology/types";

export type PsychologySessionRecord = {
  id: string;
  organizationId: string;
  patientId: string;
  professionalId: string | null;
  appointmentId: string | null;
  sessionType: SessionType;
  moodRating: number | null;
  anxietyLevel: number | null;
  chiefComplaint: string | null;
  sessionNotes: string | null;
  therapeuticApproach: string | null;
  homeworkAssigned: string | null;
  riskAssessment: RiskLevel | null;
  nextSessionGoals: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
};

export type PsychologyGoalRecord = {
  id: string;
  organizationId: string;
  patientId: string;
  description: string;
  targetDate: Date | null;
  status: GoalStatus;
  progress: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
};

export type PatientPsychologyChartData = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  sessions: PsychologySessionRecord[];
  goals: PsychologyGoalRecord[];
};

export async function getPatientPsychologyChart(
  patientId: string,
): Promise<ActionResult<PatientPsychologyChartData>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "psychology.view")) {
      return { success: false, error: "Forbidden" };
    }

    const { patient, sessions, goals } = await getChartService(
      patientId,
      profile.organizationId,
    );

    if (!patient) return { success: false, error: "Patient not found" };

    return {
      success: true,
      data: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        birthDate: patient.birthDate,
        gender: patient.gender ? String(patient.gender) : null,
        phone: patient.phone,
        email: patient.email,
        sessions: sessions.map((s) => ({
          id: s.id,
          organizationId: s.organizationId,
          patientId: s.patientId,
          professionalId: s.professionalId,
          appointmentId: s.appointmentId,
          sessionType: s.sessionType as SessionType,
          moodRating: s.moodRating,
          anxietyLevel: s.anxietyLevel,
          chiefComplaint: s.chiefComplaint,
          sessionNotes: s.sessionNotes,
          therapeuticApproach: s.therapeuticApproach,
          homeworkAssigned: s.homeworkAssigned,
          riskAssessment: s.riskAssessment as RiskLevel | null,
          nextSessionGoals: s.nextSessionGoals,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          createdBy: s.createdBy,
        })),
        goals: goals.map((g) => ({
          id: g.id,
          organizationId: g.organizationId,
          patientId: g.patientId,
          description: g.description,
          targetDate: g.targetDate,
          status: g.status as GoalStatus,
          progress: g.progress,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
          createdBy: g.createdBy,
        })),
      },
    };
  } catch (error) {
    console.error("getPatientPsychologyChart error:", error);
    return { success: false, error: "Failed to fetch psychology chart" };
  }
}

export type CreatePsychologySessionInput = {
  sessionType?: SessionType;
  moodRating?: number;
  anxietyLevel?: number;
  chiefComplaint?: string;
  sessionNotes?: string;
  therapeuticApproach?: string;
  homeworkAssigned?: string;
  riskAssessment?: RiskLevel;
  nextSessionGoals?: string;
};

export async function createPsychologySession(
  patientId: string,
  input: CreatePsychologySessionInput,
): Promise<ActionResult<PsychologySessionRecord>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "psychology.write")) {
      return { success: false, error: "Forbidden" };
    }

    const session = await createSessionService({
      organizationId: profile.organizationId,
      patientId,
      sessionType: input.sessionType,
      moodRating: input.moodRating,
      anxietyLevel: input.anxietyLevel,
      chiefComplaint: input.chiefComplaint,
      sessionNotes: input.sessionNotes,
      therapeuticApproach: input.therapeuticApproach,
      homeworkAssigned: input.homeworkAssigned,
      riskAssessment: input.riskAssessment,
      nextSessionGoals: input.nextSessionGoals,
      createdBy: profile.id,
    });

    return {
      success: true,
      data: {
        id: session.id,
        organizationId: session.organizationId,
        patientId: session.patientId,
        professionalId: session.professionalId,
        appointmentId: session.appointmentId,
        sessionType: session.sessionType as SessionType,
        moodRating: session.moodRating,
        anxietyLevel: session.anxietyLevel,
        chiefComplaint: session.chiefComplaint,
        sessionNotes: session.sessionNotes,
        therapeuticApproach: session.therapeuticApproach,
        homeworkAssigned: session.homeworkAssigned,
        riskAssessment: session.riskAssessment as RiskLevel | null,
        nextSessionGoals: session.nextSessionGoals,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        createdBy: session.createdBy,
      },
    };
  } catch (error) {
    console.error("createPsychologySession error:", error);
    return { success: false, error: "Failed to create psychology session" };
  }
}

export type UpdatePsychologySessionInput = {
  sessionType?: SessionType;
  moodRating?: number | null;
  anxietyLevel?: number | null;
  chiefComplaint?: string | null;
  sessionNotes?: string | null;
  therapeuticApproach?: string | null;
  homeworkAssigned?: string | null;
  riskAssessment?: RiskLevel | null;
  nextSessionGoals?: string | null;
};

export async function updatePsychologySession(
  id: string,
  input: UpdatePsychologySessionInput,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "psychology.write")) {
      return { success: false, error: "Forbidden" };
    }

    await updateSessionService(id, profile.organizationId, input);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("updatePsychologySession error:", error);
    return { success: false, error: "Failed to update psychology session" };
  }
}

export async function deletePsychologySession(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "psychology.delete")) {
      return { success: false, error: "Forbidden" };
    }

    await deleteSessionService(id, profile.organizationId);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("deletePsychologySession error:", error);
    return { success: false, error: "Failed to delete psychology session" };
  }
}

export type CreatePsychologyGoalInput = {
  description: string;
  targetDate?: Date;
  progress?: string;
};

export async function createPsychologyGoal(
  patientId: string,
  input: CreatePsychologyGoalInput,
): Promise<ActionResult<PsychologyGoalRecord>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "psychology.write")) {
      return { success: false, error: "Forbidden" };
    }

    const goal = await createGoalService({
      organizationId: profile.organizationId,
      patientId,
      description: input.description,
      targetDate: input.targetDate,
      progress: input.progress,
      createdBy: profile.id,
    });

    return {
      success: true,
      data: {
        id: goal.id,
        organizationId: goal.organizationId,
        patientId: goal.patientId,
        description: goal.description,
        targetDate: goal.targetDate,
        status: goal.status as GoalStatus,
        progress: goal.progress,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
        createdBy: goal.createdBy,
      },
    };
  } catch (error) {
    console.error("createPsychologyGoal error:", error);
    return { success: false, error: "Failed to create psychology goal" };
  }
}

export type UpdatePsychologyGoalInput = {
  description?: string;
  targetDate?: Date | null;
  status?: GoalStatus;
  progress?: string | null;
};

export async function updatePsychologyGoal(
  id: string,
  input: UpdatePsychologyGoalInput,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "psychology.write")) {
      return { success: false, error: "Forbidden" };
    }

    await updateGoalService(id, profile.organizationId, input);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("updatePsychologyGoal error:", error);
    return { success: false, error: "Failed to update psychology goal" };
  }
}

export async function deletePsychologyGoal(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "psychology.delete")) {
      return { success: false, error: "Forbidden" };
    }

    await deleteGoalService(id, profile.organizationId);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("deletePsychologyGoal error:", error);
    return { success: false, error: "Failed to delete psychology goal" };
  }
}

export type PsychologyStats = {
  sessionsThisMonth: number;
  highRiskPatients: number;
};

export async function getPsychologyStats(): Promise<
  ActionResult<PsychologyStats>
> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "psychology.view")) {
      return { success: false, error: "Forbidden" };
    }

    const stats = await getStatsService(profile.organizationId);

    return { success: true, data: stats };
  } catch (error) {
    console.error("getPsychologyStats error:", error);
    return { success: false, error: "Failed to fetch psychology stats" };
  }
}

export type RecentPsychologyPatient = {
  patientId: string;
  patientName: string;
  lastSessionAt: Date;
};

export async function getRecentPsychologyPatients(): Promise<
  ActionResult<RecentPsychologyPatient[]>
> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "psychology.view")) {
      return { success: false, error: "Forbidden" };
    }

    const patients = await getRecentPatientsService(profile.organizationId);

    return { success: true, data: patients };
  } catch (error) {
    console.error("getRecentPsychologyPatients error:", error);
    return {
      success: false,
      error: "Failed to fetch recent psychology patients",
    };
  }
}

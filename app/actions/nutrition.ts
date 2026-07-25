"use server";

import { checkPermission } from "@/core/permissions/utils";
import type { ActionResult } from "@/core/billing/types";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import {
  getPatientNutritionChart as getChartService,
  createNutritionPlan as createPlanService,
  updateNutritionPlan as updatePlanService,
  createNutritionSession as createSessionService,
  updateNutritionSession as updateSessionService,
  deleteNutritionSession as deleteSessionService,
  getNutritionStats as getStatsService,
  getRecentNutritionPatients as getRecentPatientsService,
} from "@/core/nutrition/services/nutrition.service";
import type { NutritionPlanStatus } from "@/core/nutrition/types";

export type NutritionPlanRecord = {
  id: string;
  organizationId: string;
  patientId: string;
  professionalId: string | null;
  title: string;
  caloricTarget: number | null;
  proteinTarget: number | null;
  carbTarget: number | null;
  fatTarget: number | null;
  notes: string | null;
  startDate: Date;
  status: NutritionPlanStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
};

export type NutritionSessionRecord = {
  id: string;
  organizationId: string;
  patientId: string;
  planId: string | null;
  appointmentId: string | null;
  professionalId: string | null;
  weight: number | null;
  bmi: number | null;
  chiefComplaint: string | null;
  observations: string | null;
  dietaryChanges: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
};

export type PatientNutritionChartData = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  plans: NutritionPlanRecord[];
  sessions: NutritionSessionRecord[];
};

export async function getPatientNutritionChart(
  patientId: string,
): Promise<ActionResult<PatientNutritionChartData>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "nutrition.view")) {
      return { success: false, error: "Forbidden" };
    }

    const { patient, plans, sessions } = await getChartService(
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
        plans: plans.map((p) => ({
          id: p.id,
          organizationId: p.organizationId,
          patientId: p.patientId,
          professionalId: p.professionalId,
          title: p.title,
          caloricTarget: p.caloricTarget,
          proteinTarget: p.proteinTarget,
          carbTarget: p.carbTarget,
          fatTarget: p.fatTarget,
          notes: p.notes,
          startDate: p.startDate,
          status: p.status as NutritionPlanStatus,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          createdBy: p.createdBy,
        })),
        sessions: sessions.map((s) => ({
          id: s.id,
          organizationId: s.organizationId,
          patientId: s.patientId,
          planId: s.planId,
          appointmentId: s.appointmentId,
          professionalId: s.professionalId,
          weight: s.weight,
          bmi: s.bmi,
          chiefComplaint: s.chiefComplaint,
          observations: s.observations,
          dietaryChanges: s.dietaryChanges,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          createdBy: s.createdBy,
        })),
      },
    };
  } catch (error) {
    console.error("getPatientNutritionChart error:", error);
    return { success: false, error: "Failed to fetch nutrition chart" };
  }
}

export type CreateNutritionPlanInput = {
  title: string;
  caloricTarget?: number;
  proteinTarget?: number;
  carbTarget?: number;
  fatTarget?: number;
  notes?: string;
  startDate: Date;
};

export async function createNutritionPlan(
  patientId: string,
  input: CreateNutritionPlanInput,
): Promise<ActionResult<NutritionPlanRecord>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "nutrition.write")) {
      return { success: false, error: "Forbidden" };
    }

    const plan = await createPlanService({
      organizationId: profile.organizationId,
      patientId,
      title: input.title,
      caloricTarget: input.caloricTarget,
      proteinTarget: input.proteinTarget,
      carbTarget: input.carbTarget,
      fatTarget: input.fatTarget,
      notes: input.notes,
      startDate: input.startDate,
      createdBy: profile.id,
    });

    return {
      success: true,
      data: {
        id: plan.id,
        organizationId: plan.organizationId,
        patientId: plan.patientId,
        professionalId: plan.professionalId,
        title: plan.title,
        caloricTarget: plan.caloricTarget,
        proteinTarget: plan.proteinTarget,
        carbTarget: plan.carbTarget,
        fatTarget: plan.fatTarget,
        notes: plan.notes,
        startDate: plan.startDate,
        status: plan.status as NutritionPlanStatus,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        createdBy: plan.createdBy,
      },
    };
  } catch (error) {
    console.error("createNutritionPlan error:", error);
    return { success: false, error: "Failed to create nutrition plan" };
  }
}

export type UpdateNutritionPlanInput = {
  title?: string;
  caloricTarget?: number | null;
  proteinTarget?: number | null;
  carbTarget?: number | null;
  fatTarget?: number | null;
  notes?: string | null;
  status?: NutritionPlanStatus;
};

export async function updateNutritionPlan(
  id: string,
  input: UpdateNutritionPlanInput,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "nutrition.write")) {
      return { success: false, error: "Forbidden" };
    }

    await updatePlanService(id, profile.organizationId, input);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateNutritionPlan error:", error);
    return { success: false, error: "Failed to update nutrition plan" };
  }
}

export type CreateNutritionSessionInput = {
  planId?: string;
  weight?: number;
  bmi?: number;
  chiefComplaint?: string;
  observations?: string;
  dietaryChanges?: string;
};

export async function createNutritionSession(
  patientId: string,
  input: CreateNutritionSessionInput,
): Promise<ActionResult<NutritionSessionRecord>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "nutrition.write")) {
      return { success: false, error: "Forbidden" };
    }

    const session = await createSessionService({
      organizationId: profile.organizationId,
      patientId,
      planId: input.planId,
      weight: input.weight,
      bmi: input.bmi,
      chiefComplaint: input.chiefComplaint,
      observations: input.observations,
      dietaryChanges: input.dietaryChanges,
      createdBy: profile.id,
    });

    return {
      success: true,
      data: {
        id: session.id,
        organizationId: session.organizationId,
        patientId: session.patientId,
        planId: session.planId,
        appointmentId: session.appointmentId,
        professionalId: session.professionalId,
        weight: session.weight,
        bmi: session.bmi,
        chiefComplaint: session.chiefComplaint,
        observations: session.observations,
        dietaryChanges: session.dietaryChanges,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        createdBy: session.createdBy,
      },
    };
  } catch (error) {
    console.error("createNutritionSession error:", error);
    return { success: false, error: "Failed to create nutrition session" };
  }
}

export type UpdateNutritionSessionInput = {
  weight?: number | null;
  bmi?: number | null;
  chiefComplaint?: string | null;
  observations?: string | null;
  dietaryChanges?: string | null;
};

export async function updateNutritionSession(
  id: string,
  input: UpdateNutritionSessionInput,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "nutrition.write")) {
      return { success: false, error: "Forbidden" };
    }

    await updateSessionService(id, profile.organizationId, input);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateNutritionSession error:", error);
    return { success: false, error: "Failed to update nutrition session" };
  }
}

export async function deleteNutritionSession(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "nutrition.delete")) {
      return { success: false, error: "Forbidden" };
    }

    await deleteSessionService(id, profile.organizationId);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteNutritionSession error:", error);
    return { success: false, error: "Failed to delete nutrition session" };
  }
}

export type NutritionStats = {
  activePlans: number;
  sessionsThisMonth: number;
};

export async function getNutritionStats(): Promise<
  ActionResult<NutritionStats>
> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "nutrition.view")) {
      return { success: false, error: "Forbidden" };
    }

    const stats = await getStatsService(profile.organizationId);

    return { success: true, data: stats };
  } catch (error) {
    console.error("getNutritionStats error:", error);
    return { success: false, error: "Failed to fetch nutrition stats" };
  }
}

export type RecentNutritionPatient = {
  patientId: string;
  patientName: string;
  lastSessionAt: Date;
};

export async function getRecentNutritionPatients(): Promise<
  ActionResult<RecentNutritionPatient[]>
> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "nutrition.view")) {
      return { success: false, error: "Forbidden" };
    }

    const patients = await getRecentPatientsService(profile.organizationId);

    return { success: true, data: patients };
  } catch (error) {
    console.error("getRecentNutritionPatients error:", error);
    return {
      success: false,
      error: "Failed to fetch recent nutrition patients",
    };
  }
}

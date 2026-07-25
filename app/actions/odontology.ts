"use server";

import { prisma } from "@/infrastructure/db/client";
import { checkPermission } from "@/core/permissions/utils";
import type { ActionResult } from "@/core/billing/types";
import type { SerializedOdontogramState } from "odonto-next";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import {
  listTreatments,
  createTreatment as createTreatmentService,
  updateTreatment as updateTreatmentService,
  deleteTreatment as deleteTreatmentService,
} from "@/core/odontology/services/treatments.service";
import type { TreatmentStatus } from "@/core/odontology/types";

export type ConsultationRecord = {
  id: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  odontogramState: SerializedOdontogramState | null;
  date: Date;
  createdBy: string | null;
};

export type TreatmentRecord = {
  id: string;
  organizationId: string;
  patientId: string;
  professionalId: string | null;
  consultationId: string | null;
  toothNumber: number | null;
  surface: string | null;
  description: string;
  status: TreatmentStatus;
  price: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
};

export type PatientChartData = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  odontogramState: SerializedOdontogramState | null;
  consultations: ConsultationRecord[];
  treatments: TreatmentRecord[];
  nextAppointment: {
    id: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    reason: string | null;
    professionalName: string | null;
    status: string;
  } | null;
};

export async function getPatientChart(
  patientId: string,
): Promise<ActionResult<PatientChartData>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "patients.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    const [patient, treatments] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: patientId, organizationId: profile.organizationId },
        include: {
          consultations: {
            orderBy: { date: "desc" },
            take: 50,
          },
          appointments: {
            where: {
              scheduledStart: { gte: new Date() },
              status: { in: ["SCHEDULED", "CONFIRMED"] },
            },
            orderBy: { scheduledStart: "asc" },
            take: 1,
          },
        },
      }),
      listTreatments(patientId, profile.organizationId),
    ]);

    if (!patient) return { success: false, error: "Patient not found" };

    const nextAppointment = patient.appointments[0] ?? null;

    return {
      success: true,
      data: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        birthDate: patient.birthDate,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        odontogramState:
          patient.odontogramState as SerializedOdontogramState | null,
        consultations: patient.consultations.map((c) => ({
          id: c.id,
          chiefComplaint: c.chiefComplaint,
          diagnosis: c.diagnosis,
          treatment: c.treatment,
          notes: c.notes,
          odontogramState:
            c.odontogramState as SerializedOdontogramState | null,
          date: c.date,
          createdBy: c.createdBy,
        })),
        treatments: treatments.map((t) => ({
          id: t.id,
          organizationId: t.organizationId,
          patientId: t.patientId,
          professionalId: t.professionalId,
          consultationId: t.consultationId,
          toothNumber: t.toothNumber,
          surface: t.surface,
          description: t.description,
          status: t.status as TreatmentStatus,
          price: t.price,
          notes: t.notes,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          createdBy: t.createdBy,
        })),
        nextAppointment: nextAppointment
          ? {
              id: nextAppointment.id,
              scheduledStart: nextAppointment.scheduledStart,
              scheduledEnd: nextAppointment.scheduledEnd,
              reason: nextAppointment.reason,
              professionalName: nextAppointment.professionalName ?? null,
              status: nextAppointment.status,
            }
          : null,
      },
    };
  } catch (error) {
    console.error("getPatientChart error:", error);
    return { success: false, error: "Failed to fetch patient chart" };
  }
}

export async function saveOdontogramState(
  patientId: string,
  state: SerializedOdontogramState,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "patients.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    await prisma.patient.updateMany({
      where: { id: patientId, organizationId: profile.organizationId },
      data: { odontogramState: state as object, updatedBy: profile.id },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("saveOdontogramState error:", error);
    return { success: false, error: "Failed to save odontogram" };
  }
}

export type SaveConsultationInput = {
  chiefComplaint?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  odontogramState?: SerializedOdontogramState;
};

export async function saveConsultation(
  patientId: string,
  input: SaveConsultationInput,
): Promise<ActionResult<ConsultationRecord>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "patients.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: profile.organizationId },
      select: { id: true },
    });
    if (!patient) return { success: false, error: "Patient not found" };

    const consultation = await prisma.consultation.create({
      data: {
        organizationId: profile.organizationId,
        patientId,
        chiefComplaint: input.chiefComplaint ?? null,
        diagnosis: input.diagnosis ?? null,
        treatment: input.treatment ?? null,
        notes: input.notes ?? null,
        odontogramState: input.odontogramState
          ? (input.odontogramState as object)
          : undefined,
        createdBy: profile.id,
      },
    });

    return {
      success: true,
      data: {
        id: consultation.id,
        chiefComplaint: consultation.chiefComplaint,
        diagnosis: consultation.diagnosis,
        treatment: consultation.treatment,
        notes: consultation.notes,
        odontogramState:
          consultation.odontogramState as SerializedOdontogramState | null,
        date: consultation.date,
        createdBy: consultation.createdBy,
      },
    };
  } catch (error) {
    console.error("saveConsultation error:", error);
    return { success: false, error: "Failed to save consultation" };
  }
}

export type UpdateConsultationInput = {
  chiefComplaint?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
};

export async function updateConsultation(
  id: string,
  input: UpdateConsultationInput,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "odontology.write",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    await prisma.consultation.updateMany({
      where: { id, organizationId: profile.organizationId },
      data: {
        chiefComplaint: input.chiefComplaint,
        diagnosis: input.diagnosis,
        treatment: input.treatment,
        notes: input.notes,
      },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateConsultation error:", error);
    return { success: false, error: "Failed to update consultation" };
  }
}

export type GetTreatmentsResult = TreatmentRecord[];

export async function getTreatments(
  patientId: string,
): Promise<ActionResult<GetTreatmentsResult>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "odontology.view",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    const treatments = await listTreatments(patientId, profile.organizationId);

    return {
      success: true,
      data: treatments.map((t) => ({
        id: t.id,
        organizationId: t.organizationId,
        patientId: t.patientId,
        professionalId: t.professionalId,
        consultationId: t.consultationId,
        toothNumber: t.toothNumber,
        surface: t.surface,
        description: t.description,
        status: t.status as TreatmentStatus,
        price: t.price,
        notes: t.notes,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        createdBy: t.createdBy,
      })),
    };
  } catch (error) {
    console.error("getTreatments error:", error);
    return { success: false, error: "Failed to fetch treatments" };
  }
}

export type CreateTreatmentInput = {
  description: string;
  toothNumber?: number;
  surface?: string;
  price?: number;
  notes?: string;
};

export async function createTreatment(
  patientId: string,
  input: CreateTreatmentInput,
): Promise<ActionResult<TreatmentRecord>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "odontology.write",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    const t = await createTreatmentService({
      organizationId: profile.organizationId,
      patientId,
      description: input.description,
      toothNumber: input.toothNumber,
      surface: input.surface,
      price: input.price,
      notes: input.notes,
      createdBy: profile.id,
    });

    return {
      success: true,
      data: {
        id: t.id,
        organizationId: t.organizationId,
        patientId: t.patientId,
        professionalId: t.professionalId,
        consultationId: t.consultationId,
        toothNumber: t.toothNumber,
        surface: t.surface,
        description: t.description,
        status: t.status as TreatmentStatus,
        price: t.price,
        notes: t.notes,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        createdBy: t.createdBy,
      },
    };
  } catch (error) {
    console.error("createTreatment error:", error);
    return { success: false, error: "Failed to create treatment" };
  }
}

export type UpdateTreatmentInput = {
  description?: string;
  status?: TreatmentStatus;
  toothNumber?: number;
  surface?: string;
  price?: number;
  notes?: string;
};

export async function updateTreatment(
  id: string,
  input: UpdateTreatmentInput,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "odontology.write",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    await updateTreatmentService(id, profile.organizationId, input);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateTreatment error:", error);
    return { success: false, error: "Failed to update treatment" };
  }
}

export async function deleteTreatment(id: string): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "odontology.delete",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    await deleteTreatmentService(id, profile.organizationId);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteTreatment error:", error);
    return { success: false, error: "Failed to delete treatment" };
  }
}

export type OdontologyStats = {
  activeTreatmentPatients: number;
  consultationsThisMonth: number;
};

export async function getOdontologyStats(): Promise<
  ActionResult<OdontologyStats>
> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "odontology.view",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activePatients, consultationsThisMonth] = await Promise.all([
      prisma.treatment.findMany({
        where: {
          organizationId: profile.organizationId,
          status: { in: ["IN_PROGRESS", "PLANNED"] },
        },
        select: { patientId: true },
        distinct: ["patientId"],
      }),
      prisma.consultation.count({
        where: {
          organizationId: profile.organizationId,
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        activeTreatmentPatients: activePatients.length,
        consultationsThisMonth,
      },
    };
  } catch (error) {
    console.error("getOdontologyStats error:", error);
    return { success: false, error: "Failed to fetch odontology stats" };
  }
}

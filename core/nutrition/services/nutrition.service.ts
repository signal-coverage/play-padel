import { prisma } from "@/infrastructure/db/client";
import type { NutritionPlanStatus } from "@/core/nutrition/types";

export async function getPatientNutritionChart(
  patientId: string,
  organizationId: string,
) {
  const [patient, plans, sessions] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: patientId, organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        gender: true,
        phone: true,
        email: true,
        status: true,
      },
    }),
    prisma.nutritionPlan.findMany({
      where: { patientId, organizationId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.nutritionSession.findMany({
      where: { patientId, organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return { patient, plans, sessions };
}

export async function createNutritionPlan(data: {
  organizationId: string;
  patientId: string;
  professionalId?: string;
  title: string;
  caloricTarget?: number;
  proteinTarget?: number;
  carbTarget?: number;
  fatTarget?: number;
  notes?: string;
  startDate: Date;
  createdBy: string;
}) {
  return prisma.nutritionPlan.create({ data });
}

export async function updateNutritionPlan(
  id: string,
  organizationId: string,
  data: {
    title?: string;
    caloricTarget?: number | null;
    proteinTarget?: number | null;
    carbTarget?: number | null;
    fatTarget?: number | null;
    notes?: string | null;
    status?: NutritionPlanStatus;
  },
) {
  return prisma.nutritionPlan.updateMany({
    where: { id, organizationId },
    data,
  });
}

export async function createNutritionSession(data: {
  organizationId: string;
  patientId: string;
  planId?: string;
  appointmentId?: string;
  professionalId?: string;
  weight?: number;
  bmi?: number;
  chiefComplaint?: string;
  observations?: string;
  dietaryChanges?: string;
  createdBy: string;
}) {
  return prisma.nutritionSession.create({ data });
}

export async function updateNutritionSession(
  id: string,
  organizationId: string,
  data: {
    weight?: number | null;
    bmi?: number | null;
    chiefComplaint?: string | null;
    observations?: string | null;
    dietaryChanges?: string | null;
  },
) {
  return prisma.nutritionSession.updateMany({
    where: { id, organizationId },
    data,
  });
}

export async function deleteNutritionSession(
  id: string,
  organizationId: string,
) {
  return prisma.nutritionSession.deleteMany({ where: { id, organizationId } });
}

export async function getRecentNutritionPatients(organizationId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSessions = await prisma.nutritionSession.findMany({
    where: {
      organizationId,
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: "desc" },
    select: { patientId: true, createdAt: true },
  });

  const seen = new Map<string, Date>();
  for (const session of recentSessions) {
    if (!seen.has(session.patientId)) {
      seen.set(session.patientId, session.createdAt);
    }
  }

  const patientIds = Array.from(seen.keys()).slice(0, 20);
  if (patientIds.length === 0) return [];

  const patients = await prisma.patient.findMany({
    where: { id: { in: patientIds }, organizationId },
    select: { id: true, firstName: true, lastName: true },
  });

  return patients.map((p) => ({
    patientId: p.id,
    patientName: `${p.firstName} ${p.lastName}`,
    lastSessionAt: seen.get(p.id)!,
  }));
}

export async function getNutritionStats(organizationId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activePlans, sessionsThisMonth] = await Promise.all([
    prisma.nutritionPlan.count({
      where: { organizationId, status: "ACTIVE" },
    }),
    prisma.nutritionSession.count({
      where: {
        organizationId,
        createdAt: { gte: startOfMonth },
      },
    }),
  ]);

  return { activePlans, sessionsThisMonth };
}

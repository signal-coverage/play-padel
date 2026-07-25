import { prisma } from "@/infrastructure/db/client";
import type {
  SessionType,
  RiskLevel,
  GoalStatus,
} from "@/core/psychology/types";

export async function getPatientPsychologyChart(
  patientId: string,
  organizationId: string,
) {
  const [patient, sessions, goals] = await Promise.all([
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
    prisma.psychologySession.findMany({
      where: { patientId, organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.psychologyGoal.findMany({
      where: { patientId, organizationId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { patient, sessions, goals };
}

export async function createPsychologySession(data: {
  organizationId: string;
  patientId: string;
  professionalId?: string;
  appointmentId?: string;
  sessionType?: SessionType;
  moodRating?: number;
  anxietyLevel?: number;
  chiefComplaint?: string;
  sessionNotes?: string;
  therapeuticApproach?: string;
  homeworkAssigned?: string;
  riskAssessment?: RiskLevel;
  nextSessionGoals?: string;
  createdBy: string;
}) {
  return prisma.psychologySession.create({ data });
}

export async function updatePsychologySession(
  id: string,
  organizationId: string,
  data: {
    sessionType?: SessionType;
    moodRating?: number | null;
    anxietyLevel?: number | null;
    chiefComplaint?: string | null;
    sessionNotes?: string | null;
    therapeuticApproach?: string | null;
    homeworkAssigned?: string | null;
    riskAssessment?: RiskLevel | null;
    nextSessionGoals?: string | null;
  },
) {
  return prisma.psychologySession.updateMany({
    where: { id, organizationId },
    data,
  });
}

export async function deletePsychologySession(
  id: string,
  organizationId: string,
) {
  return prisma.psychologySession.deleteMany({ where: { id, organizationId } });
}

export async function createPsychologyGoal(data: {
  organizationId: string;
  patientId: string;
  description: string;
  targetDate?: Date;
  status?: GoalStatus;
  progress?: string;
  createdBy: string;
}) {
  return prisma.psychologyGoal.create({ data });
}

export async function updatePsychologyGoal(
  id: string,
  organizationId: string,
  data: {
    description?: string;
    targetDate?: Date | null;
    status?: GoalStatus;
    progress?: string | null;
  },
) {
  return prisma.psychologyGoal.updateMany({
    where: { id, organizationId },
    data,
  });
}

export async function deletePsychologyGoal(id: string, organizationId: string) {
  return prisma.psychologyGoal.deleteMany({ where: { id, organizationId } });
}

export async function getRecentPsychologyPatients(organizationId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSessions = await prisma.psychologySession.findMany({
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

export async function getPsychologyStats(organizationId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [sessionsThisMonth, highRiskSessions] = await Promise.all([
    prisma.psychologySession.count({
      where: {
        organizationId,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.psychologySession.findMany({
      where: {
        organizationId,
        createdAt: { gte: ninetyDaysAgo },
        riskAssessment: { in: ["HIGH", "CRITICAL"] },
      },
      select: { patientId: true },
      distinct: ["patientId"],
    }),
  ]);

  return {
    sessionsThisMonth,
    highRiskPatients: highRiskSessions.length,
  };
}

import { prisma } from "@/infrastructure/db/client";

export async function listTreatments(
  patientId: string,
  organizationId: string,
) {
  return prisma.treatment.findMany({
    where: { patientId, organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTreatment(data: {
  organizationId: string;
  patientId: string;
  professionalId?: string;
  consultationId?: string;
  toothNumber?: number;
  surface?: string;
  description: string;
  price?: number;
  notes?: string;
  createdBy: string;
}) {
  return prisma.treatment.create({ data });
}

export async function updateTreatment(
  id: string,
  organizationId: string,
  data: {
    description?: string;
    status?: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    toothNumber?: number;
    surface?: string;
    price?: number;
    notes?: string;
  },
) {
  return prisma.treatment.updateMany({ where: { id, organizationId }, data });
}

export async function deleteTreatment(id: string, organizationId: string) {
  return prisma.treatment.deleteMany({ where: { id, organizationId } });
}

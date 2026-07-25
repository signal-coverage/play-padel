import { prisma } from "@/infrastructure/db/client";
import type { Organization } from "@/core/organizations/types";

function toOrganization(
  row: Awaited<ReturnType<typeof prisma.organization.findUnique>>,
): Organization {
  if (!row) throw new Error("Organization not found");
  return {
    ...row,
    legalName: row.legalName ?? undefined,
    taxId: row.taxId ?? undefined,
    phone: row.phone ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
    plan: row.plan as Organization["plan"],
    status: row.status as Organization["status"],
  };
}

export async function getOrganization(
  id: string,
): Promise<Organization | null> {
  const row = await prisma.organization.findUnique({ where: { id } });
  return row ? toOrganization(row) : null;
}

export async function createOrganization(
  data: Omit<Organization, "id" | "createdAt" | "updatedAt">,
  createdBy: string,
): Promise<Organization> {
  const row = await prisma.organization.create({
    data: { ...data, createdBy, updatedBy: createdBy },
  });
  return toOrganization(row);
}

export async function updateOrganization(
  id: string,
  data: Partial<Omit<Organization, "id" | "createdAt" | "createdBy">>,
  updatedBy: string,
): Promise<void> {
  await prisma.organization.update({
    where: { id },
    data: { ...data, updatedBy },
  });
}

export async function disableOrganization(
  id: string,
  updatedBy: string,
): Promise<void> {
  await prisma.organization.update({
    where: { id },
    data: { status: "DISABLED", updatedBy },
  });
}

export async function enableOrganization(
  id: string,
  updatedBy: string,
): Promise<void> {
  await prisma.organization.update({
    where: { id },
    data: { status: "ACTIVE", updatedBy },
  });
}

export async function deleteOrganization(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.pluginRegistry.deleteMany({ where: { organizationId: id } }),
    prisma.auditLog.deleteMany({ where: { organizationId: id } }),
    prisma.notification.deleteMany({ where: { organizationId: id } }),
    prisma.psychologyGoal.deleteMany({ where: { organizationId: id } }),
    prisma.psychologySession.deleteMany({ where: { organizationId: id } }),
    prisma.nutritionSession.deleteMany({ where: { organizationId: id } }),
    prisma.nutritionPlan.deleteMany({ where: { organizationId: id } }),
    prisma.treatment.deleteMany({ where: { organizationId: id } }),
    prisma.consultation.deleteMany({ where: { organizationId: id } }),
    prisma.payment.deleteMany({ where: { organizationId: id } }),
    prisma.invoice.deleteMany({ where: { organizationId: id } }),
    prisma.appointment.deleteMany({ where: { organizationId: id } }),
    prisma.patient.deleteMany({ where: { organizationId: id } }),
    prisma.workingHours.deleteMany({ where: { organizationId: id } }),
    prisma.professional.deleteMany({ where: { organizationId: id } }),
    prisma.userProfile.updateMany({
      where: { organizationId: id },
      data: { customRoleId: null },
    }),
    prisma.userProfile.deleteMany({ where: { organizationId: id } }),
    prisma.customRole.deleteMany({ where: { organizationId: id } }),
    prisma.organization.delete({ where: { id } }),
  ]);
}

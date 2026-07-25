import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import type {
  Professional,
  WorkingHours,
  ProfessionalFilters,
  PaginatedProfessionals,
} from "@/core/professionals/types";
import type {
  CreateProfessionalInput,
  UpdateProfessionalInput,
  CreateWorkingHoursInput,
} from "@/core/professionals/schemas/professional.schema";

type ProfessionalRow = NonNullable<
  Awaited<ReturnType<typeof prisma.professional.findUnique>>
>;
type WorkingHoursRow = NonNullable<
  Awaited<ReturnType<typeof prisma.workingHours.findUnique>>
>;

function toProfessional(row: ProfessionalRow): Professional {
  return {
    id: row.id,
    organizationId: row.organizationId,
    displayName: row.displayName,
    specialties: row.specialties,
    license: row.license ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    calendarColor: row.calendarColor ?? undefined,
    userId: row.userId ?? undefined,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy ?? undefined,
    updatedBy: row.updatedBy ?? undefined,
    deletedAt: row.deletedAt ?? undefined,
    deletedBy: row.deletedBy ?? undefined,
  };
}

function toWorkingHours(row: WorkingHoursRow): WorkingHours {
  return {
    id: row.id,
    organizationId: row.organizationId,
    professionalId: row.professionalId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    active: row.active,
    createdAt: row.createdAt,
  };
}

export async function listProfessionals(
  orgId: string,
  filters: ProfessionalFilters,
): Promise<PaginatedProfessionals> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const active = filters.active ?? true;

  const where: Prisma.ProfessionalWhereInput = {
    organizationId: orgId,
    active,
    ...(filters.search
      ? {
          displayName: { contains: filters.search, mode: "insensitive" },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      orderBy: { displayName: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.professional.count({ where }),
  ]);

  return {
    data: rows.map(toProfessional),
    total,
    page,
    pageSize,
  };
}

export async function getProfessional(
  orgId: string,
  id: string,
): Promise<Professional | null> {
  const row = await prisma.professional.findUnique({
    where: { id, organizationId: orgId },
    include: { workingHours: { orderBy: { dayOfWeek: "asc" } } },
  });
  return row ? toProfessional(row) : null;
}

export async function createProfessional(
  orgId: string,
  createdBy: string,
  input: CreateProfessionalInput,
): Promise<Professional> {
  const row = await prisma.professional.create({
    data: {
      organizationId: orgId,
      displayName: input.displayName,
      specialties: input.specialties ?? [],
      license: input.license ?? null,
      phone: input.phone ?? null,
      email: input.email || null,
      calendarColor: input.calendarColor ?? null,
      userId: input.userId ?? null,
      active: true,
      createdBy,
      updatedBy: createdBy,
    },
  });
  return toProfessional(row);
}

export async function updateProfessional(
  orgId: string,
  id: string,
  updatedBy: string,
  input: UpdateProfessionalInput,
): Promise<Professional> {
  const row = await prisma.professional.update({
    where: { id, organizationId: orgId },
    data: {
      ...(input.displayName !== undefined && {
        displayName: input.displayName,
      }),
      ...(input.specialties !== undefined && {
        specialties: input.specialties,
      }),
      ...(input.license !== undefined && { license: input.license ?? null }),
      ...(input.phone !== undefined && { phone: input.phone ?? null }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.calendarColor !== undefined && {
        calendarColor: input.calendarColor ?? null,
      }),
      ...(input.userId !== undefined && { userId: input.userId ?? null }),
      updatedBy,
    },
  });
  return toProfessional(row);
}

export async function deactivateProfessional(
  orgId: string,
  id: string,
  updatedBy: string,
): Promise<void> {
  await prisma.professional.update({
    where: { id, organizationId: orgId },
    data: {
      active: false,
      deletedAt: new Date(),
      deletedBy: updatedBy,
      updatedBy,
    },
  });
}

export async function getWorkingHours(
  professionalId: string,
  organizationId: string,
): Promise<WorkingHours[]> {
  const rows = await prisma.workingHours.findMany({
    where: { professionalId, organizationId },
    orderBy: { dayOfWeek: "asc" },
  });
  return rows.map(toWorkingHours);
}

export async function createWorkingHours(
  orgId: string,
  professionalId: string,
  input: CreateWorkingHoursInput,
): Promise<WorkingHours> {
  const row = await prisma.workingHours.create({
    data: {
      organizationId: orgId,
      professionalId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      active: input.active ?? true,
    },
  });
  return toWorkingHours(row);
}

export async function deleteWorkingHours(
  orgId: string,
  id: string,
): Promise<void> {
  await prisma.workingHours.updateMany({
    where: { id, organizationId: orgId },
    data: { active: false },
  });
}

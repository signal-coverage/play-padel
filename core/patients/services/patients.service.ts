import { prisma } from "@/infrastructure/db/client";
import type {
  Patient,
  PatientStatus,
  Gender,
  DocumentType,
  InsuranceInfo,
  EmergencyContact,
  PatientAddress,
  PatientFilters,
  PaginatedPatients,
} from "@/core/patients/types";
import type {
  CreatePatientInput,
  UpdatePatientInput,
} from "@/core/patients/schemas/patient.schema";
import { Prisma } from "@/lib/generated/prisma/client";

type PatientRow = NonNullable<
  Awaited<ReturnType<typeof prisma.patient.findUnique>>
>;

function toInsuranceInfo(raw: unknown): InsuranceInfo | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  return {
    provider: typeof r.provider === "string" ? r.provider : undefined,
    policyNumber:
      typeof r.policyNumber === "string" ? r.policyNumber : undefined,
    groupNumber: typeof r.groupNumber === "string" ? r.groupNumber : undefined,
    holderName: typeof r.holderName === "string" ? r.holderName : undefined,
  };
}

function toEmergencyContact(raw: unknown): EmergencyContact | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  return {
    name: typeof r.name === "string" ? r.name : "",
    phone: typeof r.phone === "string" ? r.phone : "",
    relationship: typeof r.relationship === "string" ? r.relationship : "",
  };
}

function toPatientAddress(raw: unknown): PatientAddress | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  return {
    street: typeof r.street === "string" ? r.street : undefined,
    city: typeof r.city === "string" ? r.city : undefined,
    state: typeof r.state === "string" ? r.state : undefined,
    postalCode: typeof r.postalCode === "string" ? r.postalCode : undefined,
    country: typeof r.country === "string" ? r.country : undefined,
  };
}

function toPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    organizationId: row.organizationId,
    documentType: row.documentType as DocumentType,
    documentNumber: row.documentNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    birthDate: row.birthDate ?? undefined,
    gender: row.gender as Gender | undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: toPatientAddress(row.address),
    insurance: toInsuranceInfo(row.insurance),
    emergencyContact: toEmergencyContact(row.emergencyContact),
    tags: row.tags,
    notes: row.notes ?? undefined,
    status: row.status as PatientStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy ?? undefined,
    updatedBy: row.updatedBy ?? undefined,
    deletedAt: row.deletedAt ?? undefined,
    deletedBy: row.deletedBy ?? undefined,
  };
}

export async function listPatients(
  orgId: string,
  filters: PatientFilters,
): Promise<PaginatedPatients> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where: Prisma.PatientWhereInput = {
    organizationId: orgId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { firstName: { contains: filters.search, mode: "insensitive" } },
            { lastName: { contains: filters.search, mode: "insensitive" } },
            {
              documentNumber: { contains: filters.search, mode: "insensitive" },
            },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    data: rows.map(toPatient),
    total,
    page,
    pageSize,
  };
}

export async function getPatient(
  orgId: string,
  id: string,
): Promise<Patient | null> {
  const row = await prisma.patient.findUnique({
    where: { id, organizationId: orgId },
  });
  return row ? toPatient(row) : null;
}

export async function createPatient(
  orgId: string,
  input: CreatePatientInput,
  createdBy: string,
): Promise<Patient> {
  const row = await prisma.patient.create({
    data: {
      organizationId: orgId,
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      gender: input.gender ?? null,
      phone: input.phone ?? null,
      email: input.email || null,
      address: input.address ?? Prisma.JsonNull,
      insurance: input.insurance ?? Prisma.JsonNull,
      emergencyContact: input.emergencyContact ?? Prisma.JsonNull,
      tags: input.tags ?? [],
      notes: input.notes ?? null,
      status: "ACTIVE",
      createdBy,
      updatedBy: createdBy,
    },
  });
  return toPatient(row);
}

export async function updatePatient(
  orgId: string,
  id: string,
  input: UpdatePatientInput,
  updatedBy: string,
): Promise<Patient> {
  const row = await prisma.patient.update({
    where: { id, organizationId: orgId },
    data: {
      ...(input.documentType !== undefined && {
        documentType: input.documentType,
      }),
      ...(input.documentNumber !== undefined && {
        documentNumber: input.documentNumber,
      }),
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.birthDate !== undefined && {
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
      }),
      ...(input.gender !== undefined && { gender: input.gender ?? null }),
      ...(input.phone !== undefined && { phone: input.phone ?? null }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.address !== undefined && {
        address: input.address ?? Prisma.JsonNull,
      }),
      ...(input.insurance !== undefined && {
        insurance: input.insurance ?? Prisma.JsonNull,
      }),
      ...(input.emergencyContact !== undefined && {
        emergencyContact: input.emergencyContact ?? Prisma.JsonNull,
      }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.notes !== undefined && { notes: input.notes ?? null }),
      ...(input.status !== undefined && { status: input.status }),
      updatedBy,
    },
  });
  return toPatient(row);
}

export async function deletePatient(
  orgId: string,
  id: string,
  deletedBy: string,
): Promise<void> {
  await prisma.patient.update({
    where: { id, organizationId: orgId },
    data: {
      status: "ARCHIVED",
      deletedAt: new Date(),
      deletedBy,
    },
  });
}

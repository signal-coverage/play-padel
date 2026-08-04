import { prisma } from "@/infrastructure/db/client";
import type {
  Club,
  CreateClubInput,
  UpdateClubInput,
} from "@/core/clubs/types";

type ClubRow = NonNullable<Awaited<ReturnType<typeof prisma.club.findUnique>>>;

function toClub(row: ClubRow): Club {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legalName ?? undefined,
    taxId: row.taxId ?? undefined,
    email: row.email,
    phone: row.phone ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
    timezone: row.timezone,
    currency: row.currency,
    plan: row.plan as Club["plan"],
    status: row.status as Club["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
  };
}

export async function createClub(
  input: CreateClubInput,
  createdBy: string,
): Promise<Club> {
  const row = await prisma.club.create({
    data: {
      name: input.name,
      legalName: input.legalName ?? null,
      taxId: input.taxId ?? null,
      email: input.email,
      phone: input.phone ?? null,
      logoUrl: input.logoUrl ?? null,
      timezone: input.timezone,
      currency: input.currency,
      plan: input.plan ?? "FREE",
      createdBy,
      updatedBy: createdBy,
    },
  });
  return toClub(row);
}

export async function getClubById(id: string): Promise<Club | null> {
  const row = await prisma.club.findUnique({
    where: { id },
  });
  if (!row) return null;
  return toClub(row);
}

export async function updateClub(
  id: string,
  input: UpdateClubInput,
  updatedBy: string,
): Promise<Club> {
  const row = await prisma.club.update({
    where: { id },
    data: { ...input, updatedBy },
  });
  return toClub(row);
}

/**
 * Clubs regular users can browse and reserve courts at — see
 * docs/reservation-flow.md for the player-facing flow this backs.
 */
export async function listActiveClubs(): Promise<Club[]> {
  const rows = await prisma.club.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
  return rows.map(toClub);
}

import { prisma } from "@/infrastructure/db/client";
import type { SetClubBankTransferAccountInput } from "@/core/clubs/schemas/bankTransferAccount.schema";

export async function getClubBankTransferAccount(clubId: string) {
  return prisma.clubBankTransferAccount.findUnique({ where: { clubId } });
}

/**
 * Batched equivalent of calling getClubBankTransferAccount per club in a
 * loop — same "ONE findMany, never N lookups" convention already used by
 * core/clubs/services/clubs.service.ts's listActiveClubs (owner photo) and
 * core/courts/services/courts.service.ts (court slots) for this same N+1
 * class, previously found and fixed for /api/player/clubs's other per-club
 * lookups.
 */
export async function getClubBankTransferAccountsByClubIds(
  clubIds: string[],
): Promise<
  Map<string, Awaited<ReturnType<typeof getClubBankTransferAccount>>>
> {
  if (clubIds.length === 0) return new Map();

  const rows = await prisma.clubBankTransferAccount.findMany({
    where: { clubId: { in: clubIds } },
  });

  return new Map(rows.map((row) => [row.clubId, row]));
}

export async function setClubBankTransferAccount(
  clubId: string,
  input: SetClubBankTransferAccountInput,
  updatedBy: string,
) {
  return prisma.clubBankTransferAccount.upsert({
    where: { clubId },
    create: { clubId, ...input, updatedBy },
    update: { ...input, updatedBy },
  });
}

import { prisma } from "@/infrastructure/db/client";
import type { SetClubBankTransferAccountInput } from "@/core/clubs/schemas/bankTransferAccount.schema";

export async function getClubBankTransferAccount(clubId: string) {
  return prisma.clubBankTransferAccount.findUnique({ where: { clubId } });
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

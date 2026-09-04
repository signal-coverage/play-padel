import { z } from "zod";

export const setClubBankTransferAccountSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  cbu: z.string().regex(/^\d{22}$/, "CBU must be exactly 22 digits"),
  alias: z.string().optional(),
  accountHolderName: z.string().optional(),
});

export type SetClubBankTransferAccountInput = z.infer<
  typeof setClubBankTransferAccountSchema
>;

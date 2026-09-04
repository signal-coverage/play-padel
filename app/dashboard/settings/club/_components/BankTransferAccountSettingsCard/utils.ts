import type {
  BankTransferAccountFormValues,
  ClubBankTransferAccount,
} from "./types";

// Same 22-digit shape enforced server-side by
// setClubBankTransferAccountSchema — duplicated here for live client-side
// feedback rather than importing across the core/app boundary.
export const CBU_PATTERN = /^\d{22}$/;

/**
 * Builds the form's editable state from the club's saved bank transfer
 * account, defaulting to an empty form when none exists yet (a club that
 * hasn't set one up is a valid, expected state).
 */
export function buildBankTransferFormValues(
  account: ClubBankTransferAccount | null,
): BankTransferAccountFormValues {
  return {
    bankName: account?.bankName ?? "",
    cbu: account?.cbu ?? "",
    alias: account?.alias ?? "",
    accountHolderName: account?.accountHolderName ?? "",
  };
}

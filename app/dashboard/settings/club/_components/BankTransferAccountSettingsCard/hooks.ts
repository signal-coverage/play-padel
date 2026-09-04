"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CLUB_OPERATIONAL_STATUS_QUERY_KEY } from "@/app/dashboard/_components/ClubOperationalGate/consts";
import type { ClubBankTransferAccount } from "./types";

const BANK_TRANSFER_ACCOUNT_QUERY_KEY = [
  "club-bank-transfer-account",
  "settings",
] as const;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

export function useClubBankTransferAccount() {
  return useQuery({
    queryKey: BANK_TRANSFER_ACCOUNT_QUERY_KEY,
    queryFn: () =>
      fetchJson<{ account: ClubBankTransferAccount | null }>(
        "/api/clubs/bank-transfer-account",
      ).then((data) => data.account),
  });
}

export type SetBankTransferAccountInput = {
  bankName: string;
  cbu: string;
  alias?: string;
  accountHolderName?: string;
};

export function useSetClubBankTransferAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetBankTransferAccountInput) =>
      fetchJson<{ account: ClubBankTransferAccount }>(
        "/api/clubs/bank-transfer-account",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(BANK_TRANSFER_ACCOUNT_QUERY_KEY, data.account);
      // Saving a bank transfer account is a same-page mutation (no
      // navigation), so the dashboard's own operational-status gate query
      // won't otherwise know to refetch — this is the one that unlocks the
      // gate immediately when this card is reused inside
      // PaymentActivationScreen. Harmless no-op when this card is mounted in
      // ordinary Club Settings, where that query isn't mounted at all.
      queryClient.invalidateQueries({
        queryKey: CLUB_OPERATIONAL_STATUS_QUERY_KEY,
      });
      toast.success("Bank transfer account saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

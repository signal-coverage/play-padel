"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { CBU_PATTERN, buildBankTransferFormValues } from "./utils";
import {
  useClubBankTransferAccount,
  useSetClubBankTransferAccount,
} from "./hooks";
import type {
  BankTransferAccountFormValues,
  BankTransferAccountSettingsCardProps,
} from "./types";

export function BankTransferAccountSettingsCard({
  submitLabel,
  allowSkip = false,
  onDone,
}: BankTransferAccountSettingsCardProps = {}) {
  const { data: account, isLoading } = useClubBankTransferAccount();
  const setAccount = useSetClubBankTransferAccount();

  const [values, setValues] = useState<BankTransferAccountFormValues>(() =>
    buildBankTransferFormValues(null),
  );

  // Seeds the form once the club's saved bank transfer account arrives.
  // Adjusted during render (comparing against a plain state value, not a
  // ref) rather than in a `useEffect` — same pattern OperatingHoursSettingsCard
  // and CourtFormSheet.tsx already use for this exact "seed once data
  // arrives" need, since this repo's lint config is stricter than typical
  // Next.js defaults about both `react-hooks/set-state-in-effect` and
  // reading/writing refs during render.
  const [seeded, setSeeded] = useState(false);
  if (account && !seeded) {
    setValues(buildBankTransferFormValues(account));
    setSeeded(true);
  }

  const isCbuValid = CBU_PATTERN.test(values.cbu);
  const isBankNameValid = values.bankName.trim().length > 0;
  const isFormValid = isBankNameValid && isCbuValid;

  function handleChange(field: keyof BankTransferAccountFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setValues((prev) => ({ ...prev, [field]: value }));
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isFormValid) {
      if (allowSkip) onDone?.();
      return;
    }

    await setAccount.mutateAsync({
      bankName: values.bankName,
      cbu: values.cbu,
      alias: values.alias || undefined,
      accountHolderName: values.accountHolderName || undefined,
    });
    onDone?.();
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-lg">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Bank Transfer
        </h1>
        <p className="text-sm text-muted-foreground mt-1 text-pretty">
          Let players pay by bank transfer directly to your club&apos;s account,
          as an alternative to Mercado Pago.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="bank-transfer-bank-name">Bank name *</FieldLabel>
          <Input
            id="bank-transfer-bank-name"
            placeholder="Banco Nación"
            value={values.bankName}
            onChange={handleChange("bankName")}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="bank-transfer-cbu">CBU *</FieldLabel>
          <Input
            id="bank-transfer-cbu"
            placeholder="0000000000000000000000"
            maxLength={22}
            inputMode="numeric"
            value={values.cbu}
            onChange={handleChange("cbu")}
            aria-invalid={values.cbu.length > 0 && !isCbuValid}
          />
          <FieldError
            errors={
              values.cbu.length > 0 && !isCbuValid
                ? [{ message: "CBU must be exactly 22 digits" }]
                : []
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="bank-transfer-alias">Alias</FieldLabel>
          <Input
            id="bank-transfer-alias"
            placeholder="club.padel.mp"
            value={values.alias}
            onChange={handleChange("alias")}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="bank-transfer-account-holder-name">
            Account holder name
          </FieldLabel>
          <Input
            id="bank-transfer-account-holder-name"
            placeholder="Club Padel Norte SA"
            value={values.accountHolderName}
            onChange={handleChange("accountHolderName")}
          />
        </Field>

        <div>
          <Button
            type="submit"
            disabled={setAccount.isPending || (!isFormValid && !allowSkip)}
          >
            {setAccount.isPending ? "Saving…" : (submitLabel ?? "Save changes")}
          </Button>
        </div>
      </form>
    </div>
  );
}

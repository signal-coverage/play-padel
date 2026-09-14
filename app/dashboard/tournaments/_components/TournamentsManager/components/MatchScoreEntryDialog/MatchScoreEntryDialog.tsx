"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  buildMatchScoreFormSchema,
  DEFAULT_VALUES,
  toMatchScoreSets,
} from "./consts";
import type { MatchScoreFormInput, MatchScoreFormValues } from "./consts";
import type { MatchScoreEntryDialogProps } from "./types";

/**
 * Always shows exactly 3 set rows — set 3's fields are optional text inputs
 * rather than conditionally rendered, per the task's own "simplify to always
 * showing exactly 3 rows with the 3rd optional" option (chosen over
 * client-side dynamic add/remove for simplicity). matchScoreFormSchema still
 * mirrors deriveMatchResult's own best-of-3 logic to require/reject set 3.
 */
export function MatchScoreEntryDialog({
  open,
  onOpenChange,
  matchLabel,
  onSubmit,
  isSubmitting,
}: MatchScoreEntryDialogProps) {
  const t = useTranslations("MatchScoreEntryDialog");
  const tValidation = useTranslations("MatchScoreEntryValidation");
  // Rebuilt from the current locale's messages on every render — zod schema
  // construction is cheap (no I/O), so there's no need to memoize this
  // against tValidation's identity (same rationale as OnboardingWizard's own
  // buildOnboardingFormSchema(tValidation) call).
  const matchScoreFormSchema = buildMatchScoreFormSchema(tValidation);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MatchScoreFormInput, unknown, MatchScoreFormValues>({
    resolver: zodResolver(matchScoreFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  async function submit(values: MatchScoreFormValues) {
    await onSubmit(toMatchScoreSets(values));
    reset(DEFAULT_VALUES);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{matchLabel}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          {(
            [
              {
                label: t("set1"),
                aKey: "set1TeamAGames",
                bKey: "set1TeamBGames",
              },
              {
                label: t("set2"),
                aKey: "set2TeamAGames",
                bKey: "set2TeamBGames",
              },
              {
                label: t("set3"),
                aKey: "set3TeamAGames",
                bKey: "set3TeamBGames",
              },
            ] as const
          ).map((row) => (
            <div key={row.label} className="flex flex-col gap-1">
              <p className="text-sm font-medium">{row.label}</p>
              <div className="flex items-center gap-2">
                <Field>
                  <FieldLabel htmlFor={row.aKey}>{t("teamAGames")}</FieldLabel>
                  <Input
                    id={row.aKey}
                    type="number"
                    min={0}
                    {...register(row.aKey)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={row.bKey}>{t("teamBGames")}</FieldLabel>
                  <Input
                    id={row.bKey}
                    type="number"
                    min={0}
                    {...register(row.bKey)}
                  />
                </Field>
              </div>
            </div>
          ))}
          <FieldError errors={[errors.set3TeamAGames]} />

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

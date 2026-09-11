"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  DEFAULT_VALUES,
  matchScoreFormSchema,
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
          <DialogTitle>Enter score</DialogTitle>
          <DialogDescription>{matchLabel}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          {(
            [
              {
                label: "Set 1",
                aKey: "set1TeamAGames",
                bKey: "set1TeamBGames",
              },
              {
                label: "Set 2",
                aKey: "set2TeamAGames",
                bKey: "set2TeamBGames",
              },
              {
                label: "Set 3 (if needed)",
                aKey: "set3TeamAGames",
                bKey: "set3TeamBGames",
              },
            ] as const
          ).map((row) => (
            <div key={row.label} className="flex flex-col gap-1">
              <p className="text-sm font-medium">{row.label}</p>
              <div className="flex items-center gap-2">
                <Field>
                  <FieldLabel htmlFor={row.aKey}>Team A games</FieldLabel>
                  <Input
                    id={row.aKey}
                    type="number"
                    min={0}
                    {...register(row.aKey)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={row.bKey}>Team B games</FieldLabel>
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
              {isSubmitting ? "Saving…" : "Save score"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

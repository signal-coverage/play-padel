"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PADEL_CATEGORY_OPTIONS } from "@/app/onboarding/types";
import {
  DOMINANT_HAND_SELECT_OPTIONS,
  playerEditFormSchema,
  PREFERRED_SIDE_SELECT_OPTIONS,
} from "./consts";
import { formValuesToPatchInput, playerToFormValues } from "./utils";
import type { PlayerEditFormValues, PlayerEditSheetProps } from "./types";

export function PlayerEditSheet({
  open,
  onOpenChange,
  player,
  onSubmit,
  isSubmitting,
}: PlayerEditSheetProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<PlayerEditFormValues>({
    resolver: zodResolver(playerEditFormSchema),
    defaultValues: playerToFormValues(player),
  });

  // Re-seeds the form whenever a different player is opened for editing (or
  // this sheet is reopened for the same player after a previous close) —
  // same render-time state-comparison idiom CourtFormSheet's seedKey uses,
  // instead of a useEffect setState (forbidden by this project's ESLint
  // config, see react-hooks/set-state-in-effect).
  const seedKey = open ? (player?.id ?? null) : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (seedKey !== seededKey) {
    if (seedKey !== null) {
      reset(playerToFormValues(player));
    }
    setSeededKey(seedKey);
  }

  const padelCategory = useWatch({ control, name: "padelCategory" });
  const preferredSide = useWatch({ control, name: "preferredSide" });
  const dominantHand = useWatch({ control, name: "dominantHand" });

  function shownError(field: keyof PlayerEditFormValues) {
    return touchedFields[field] || isSubmitted ? [errors[field]] : [];
  }

  async function submit(values: PlayerEditFormValues) {
    try {
      await onSubmit(formValuesToPatchInput(values));
    } catch {
      // onSubmit (the parent's mutation) already surfaced its own error
      // toast — keep the sheet open with the entered values so the admin
      // can retry, same pattern as CourtFormSheet's own submit().
      return;
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onPointerDownOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Edit player</SheetTitle>
          <SheetDescription>
            Update {player?.displayName ?? "this player"}&apos;s profile.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(submit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
        >
          <Field>
            <FieldLabel htmlFor="player-display-name">Name *</FieldLabel>
            <Input
              id="player-display-name"
              {...register("displayName")}
              aria-invalid={
                (touchedFields.displayName || isSubmitted) &&
                !!errors.displayName
              }
            />
            <FieldError errors={shownError("displayName")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="player-email">Email *</FieldLabel>
            <Input
              id="player-email"
              type="email"
              {...register("email")}
              aria-invalid={
                (touchedFields.email || isSubmitted) && !!errors.email
              }
            />
            <FieldError errors={shownError("email")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="player-phone">Phone</FieldLabel>
            <Input id="player-phone" {...register("phone")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="player-padel-category">Category</FieldLabel>
            <Select
              value={padelCategory}
              onValueChange={(value) =>
                setValue("padelCategory", value, { shouldTouch: true })
              }
            >
              <SelectTrigger id="player-padel-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PADEL_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="player-preferred-side">
              Preferred side
            </FieldLabel>
            <Select
              value={preferredSide}
              onValueChange={(value) =>
                setValue("preferredSide", value, { shouldTouch: true })
              }
            >
              <SelectTrigger id="player-preferred-side">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREFERRED_SIDE_SELECT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="player-dominant-hand">
              Dominant hand
            </FieldLabel>
            <Select
              value={dominantHand}
              onValueChange={(value) =>
                setValue("dominantHand", value, { shouldTouch: true })
              }
            >
              <SelectTrigger id="player-dominant-hand">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOMINANT_HAND_SELECT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </form>

        <SheetFooter>
          <Button
            type="button"
            onClick={handleSubmit(submit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

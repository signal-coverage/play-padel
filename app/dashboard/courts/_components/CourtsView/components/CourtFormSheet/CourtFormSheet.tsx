"use client";

import { useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { courtToFormValues } from "../../utils";
import { courtFormSchema } from "./consts";
import type { CourtFormValues } from "../../types";
import type { CourtFormSheetProps } from "./types";

export function CourtFormSheet({
  open,
  onOpenChange,
  court,
  onSubmit,
  isSubmitting,
}: CourtFormSheetProps) {
  const isEditMode = Boolean(court);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<CourtFormValues>({
    resolver: zodResolver(courtFormSchema),
    defaultValues: courtToFormValues(court),
  });

  // Re-seed the form whenever a different court is opened for editing (or
  // the sheet is reopened in create mode after a previous edit).
  useEffect(() => {
    if (open) reset(courtToFormValues(court));
  }, [open, court, reset]);

  const indoor = useWatch({ control, name: "indoor" });
  const active = useWatch({ control, name: "active" });

  async function submit(values: CourtFormValues) {
    await onSubmit(values);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Edit court" : "New court"}</SheetTitle>
          <SheetDescription>
            {isEditMode
              ? "Update this court's details."
              : "Add a new court to your club."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(submit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
        >
          <Field>
            <FieldLabel htmlFor="court-name">Name *</FieldLabel>
            <Input
              id="court-name"
              placeholder="Court 1"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="court-surface">Surface</FieldLabel>
            <Input
              id="court-surface"
              placeholder="Artificial turf"
              {...register("surface")}
            />
          </Field>

          <Field orientation="horizontal">
            <FieldLabel htmlFor="court-indoor">Indoor court</FieldLabel>
            <Switch
              id="court-indoor"
              checked={indoor}
              onCheckedChange={(checked) => setValue("indoor", checked)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="court-color">Color</FieldLabel>
            <Input
              id="court-color"
              type="color"
              className="h-8 w-16 p-1"
              {...register("color")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="court-slot-duration">
              Slot duration (minutes) *
            </FieldLabel>
            <Input
              id="court-slot-duration"
              type="number"
              min={1}
              step={1}
              {...register("slotDurationMinutes", { valueAsNumber: true })}
              aria-invalid={!!errors.slotDurationMinutes}
            />
            <FieldError errors={[errors.slotDurationMinutes]} />
          </Field>

          {isEditMode && (
            <Field orientation="horizontal">
              <FieldLabel htmlFor="court-active">Active</FieldLabel>
              <Switch
                id="court-active"
                checked={active}
                onCheckedChange={(checked) => setValue("active", checked)}
              />
            </Field>
          )}
        </form>

        <SheetFooter>
          <Button
            type="button"
            onClick={handleSubmit(submit)}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving…"
              : isEditMode
                ? "Save changes"
                : "Create court"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

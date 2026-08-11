"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { newClosureFormSchema } from "./consts";
import type { NewClosureFormValues, NewClosureFormProps } from "./types";

const DEFAULT_VALUES: NewClosureFormValues = {
  startsAt: "",
  endsAt: "",
  reason: "",
  applyToAllCourts: false,
};

export function NewClosureForm({
  onSubmit,
  isSubmitting,
  showApplyToAllCourts,
}: NewClosureFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<NewClosureFormValues>({
    resolver: zodResolver(newClosureFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const applyToAllCourts = useWatch({ control, name: "applyToAllCourts" });

  async function submit(values: NewClosureFormValues) {
    const succeeded = await onSubmit(values);
    if (succeeded) {
      reset(DEFAULT_VALUES);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-4 rounded-lg border p-3"
    >
      <Field>
        <FieldLabel htmlFor="closure-starts-at">Starts</FieldLabel>
        <Input
          id="closure-starts-at"
          type="datetime-local"
          {...register("startsAt")}
          aria-invalid={!!errors.startsAt}
        />
        <FieldError errors={[errors.startsAt]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="closure-ends-at">Ends</FieldLabel>
        <Input
          id="closure-ends-at"
          type="datetime-local"
          {...register("endsAt")}
          aria-invalid={!!errors.endsAt}
        />
        <FieldError errors={[errors.endsAt]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="closure-reason">Reason *</FieldLabel>
        <Input
          id="closure-reason"
          placeholder="Court resurfacing"
          {...register("reason")}
          aria-invalid={!!errors.reason}
        />
        <FieldError errors={[errors.reason]} />
      </Field>

      {showApplyToAllCourts && (
        <Field orientation="horizontal">
          <FieldLabel htmlFor="closure-apply-all">
            Apply to all courts
          </FieldLabel>
          <Switch
            id="closure-apply-all"
            checked={applyToAllCourts}
            onCheckedChange={(checked) =>
              setValue("applyToAllCourts", checked)
            }
          />
        </Field>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating…" : "Create closure"}
      </Button>
    </form>
  );
}

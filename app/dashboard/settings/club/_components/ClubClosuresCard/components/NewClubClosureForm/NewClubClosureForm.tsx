"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { DEFAULT_VALUES, newClubClosureFormSchema } from "./consts";
import type {
  NewClubClosureFormValues,
  NewClubClosureFormProps,
} from "./types";

export function NewClubClosureForm({
  onSubmit,
  isSubmitting,
}: NewClubClosureFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewClubClosureFormValues>({
    resolver: zodResolver(newClubClosureFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  async function submit(values: NewClubClosureFormValues) {
    const succeeded = await onSubmit(values);
    if (succeeded) {
      reset(DEFAULT_VALUES);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-4 rounded-sm border p-3"
    >
      <Field>
        <FieldLabel htmlFor="club-closure-starts-at">Starts</FieldLabel>
        <Input
          id="club-closure-starts-at"
          type="datetime-local"
          {...register("startsAt")}
          aria-invalid={!!errors.startsAt}
        />
        <FieldError errors={[errors.startsAt]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="club-closure-ends-at">Ends</FieldLabel>
        <Input
          id="club-closure-ends-at"
          type="datetime-local"
          {...register("endsAt")}
          aria-invalid={!!errors.endsAt}
        />
        <FieldError errors={[errors.endsAt]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="club-closure-reason">Reason *</FieldLabel>
        <Input
          id="club-closure-reason"
          placeholder="Club rented for a private event"
          {...register("reason")}
          aria-invalid={!!errors.reason}
        />
        <FieldError errors={[errors.reason]} />
      </Field>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Closing…" : "Close the club"}
      </Button>
    </form>
  );
}

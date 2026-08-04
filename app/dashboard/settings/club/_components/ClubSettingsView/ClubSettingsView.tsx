"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { clubSettingsFormSchema } from "./consts";
import { clubToFormValues } from "./utils";
import { useCurrentClub, useUpdateClub } from "./hooks";
import type { ClubSettingsFormValues } from "./types";

export function ClubSettingsView() {
  const { data: club, isLoading } = useCurrentClub();
  const updateClub = useUpdateClub();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClubSettingsFormValues>({
    resolver: zodResolver(clubSettingsFormSchema),
    defaultValues: clubToFormValues(club),
  });

  // Re-seed the form once the club data arrives (the form mounts before the
  // query resolves) and whenever it changes underneath us after a save.
  useEffect(() => {
    if (club) reset(clubToFormValues(club));
  }, [club, reset]);

  async function submit(values: ClubSettingsFormValues) {
    await updateClub.mutateAsync(values);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-lg">
        <Skeleton className="h-9 w-full" />
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
          Club Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1 text-pretty">
          Manage your club&apos;s profile and business details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(submit)}
        className="flex max-w-lg flex-col gap-4"
      >
        <Field>
          <FieldLabel htmlFor="club-name">Name *</FieldLabel>
          <Input
            id="club-name"
            placeholder="Club Padel Norte"
            {...register("name")}
            aria-invalid={!!errors.name}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="club-legal-name">Legal name</FieldLabel>
          <Input
            id="club-legal-name"
            placeholder="Club Padel Norte S.A."
            {...register("legalName")}
          />
          <FieldError errors={[errors.legalName]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="club-tax-id">Tax ID</FieldLabel>
          <Input
            id="club-tax-id"
            placeholder="30-12345678-9"
            {...register("taxId")}
          />
          <FieldError errors={[errors.taxId]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="club-email">Email *</FieldLabel>
          <Input
            id="club-email"
            type="email"
            placeholder="contact@club.com"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="club-phone">Phone</FieldLabel>
          <Input
            id="club-phone"
            placeholder="+54 9 11 1234-5678"
            {...register("phone")}
          />
          <FieldError errors={[errors.phone]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="club-logo-url">Logo URL</FieldLabel>
          <Input
            id="club-logo-url"
            placeholder="https://…"
            {...register("logoUrl")}
          />
          <FieldError errors={[errors.logoUrl]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="club-timezone">Timezone *</FieldLabel>
          <Input
            id="club-timezone"
            placeholder="America/Argentina/Buenos_Aires"
            {...register("timezone")}
            aria-invalid={!!errors.timezone}
          />
          <FieldError errors={[errors.timezone]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="club-currency">Currency *</FieldLabel>
          <Input
            id="club-currency"
            placeholder="ARS"
            {...register("currency")}
            aria-invalid={!!errors.currency}
          />
          <FieldError errors={[errors.currency]} />
        </Field>

        <div>
          <Button type="submit" disabled={updateClub.isPending}>
            {updateClub.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

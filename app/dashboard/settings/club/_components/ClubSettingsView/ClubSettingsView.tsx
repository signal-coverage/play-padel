"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Club Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your club&apos;s profile and business details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(submit)}
        className="flex max-w-lg flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="club-name">Name *</Label>
          <Input
            id="club-name"
            placeholder="Club Padel Norte"
            {...register("name")}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="club-legal-name">Legal name</Label>
          <Input
            id="club-legal-name"
            placeholder="Club Padel Norte S.A."
            {...register("legalName")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="club-tax-id">Tax ID</Label>
          <Input
            id="club-tax-id"
            placeholder="30-12345678-9"
            {...register("taxId")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="club-email">Email *</Label>
          <Input
            id="club-email"
            type="email"
            placeholder="contact@club.com"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="club-phone">Phone</Label>
          <Input
            id="club-phone"
            placeholder="+54 9 11 1234-5678"
            {...register("phone")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="club-logo-url">Logo URL</Label>
          <Input
            id="club-logo-url"
            placeholder="https://…"
            {...register("logoUrl")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="club-timezone">Timezone *</Label>
          <Input
            id="club-timezone"
            placeholder="America/Argentina/Buenos_Aires"
            {...register("timezone")}
            aria-invalid={!!errors.timezone}
          />
          {errors.timezone && (
            <p className="text-sm text-destructive">
              {errors.timezone.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="club-currency">Currency *</Label>
          <Input
            id="club-currency"
            placeholder="ARS"
            {...register("currency")}
            aria-invalid={!!errors.currency}
          />
          {errors.currency && (
            <p className="text-sm text-destructive">
              {errors.currency.message}
            </p>
          )}
        </div>

        <div>
          <Button type="submit" disabled={updateClub.isPending}>
            {updateClub.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

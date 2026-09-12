"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneField } from "@/components/PhoneField";
import { useCountryProvinceCityFields } from "@/components/CountryProvinceCityFields";
import { TabColumnsLayout } from "@/components/TabColumnsLayout";
import { clubSettingsFormSchema } from "./consts";
import { clubToFormValues } from "./utils";
import { useCurrentClub, useUpdateClub } from "./hooks";
import type { ClubSettingsFormValues, ClubSettingsViewProps } from "./types";

export function ClubSettingsView({ clubId }: ClubSettingsViewProps = {}) {
  const { data: club, isLoading } = useCurrentClub(clubId);
  const updateClub = useUpdateClub(clubId);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ClubSettingsFormValues>({
    resolver: zodResolver(clubSettingsFormSchema),
    defaultValues: clubToFormValues(club),
  });

  const { countryField, provinceField, cityField } =
    useCountryProvinceCityFields({ control, errors });

  // Re-seed the form once the club data arrives (the form mounts before the
  // query resolves) and whenever it changes underneath us after a save.
  //
  // Adjusted during render (comparing against a plain state value), not in a
  // `useEffect`, mirroring CourtFormSheet's own re-seed idiom for the exact
  // same reason: a `useEffect`-deferred `reset()` would let this form's
  // Country/Province/City Selects (built on Radix Select) mount BEFORE the
  // seeded value lands, then transition to it afterward. Radix Select ships
  // a hidden native <select> that mirrors the controlled value for native
  // form/autofill compatibility — when that transition races the async
  // registration of its 250 country <option>s, the native element can't
  // find a matching option yet, silently reports back "" through its own
  // change event, and clobbers the just-seeded value back to blank before
  // the user ever saves. Seeding during render instead means the Selects'
  // very first commit already has the right value — a genuine first mount,
  // not a later transition — which sidesteps that race entirely.
  const seedKey = club ? JSON.stringify(club) : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (seedKey !== seededKey) {
    if (seedKey !== null) {
      reset(clubToFormValues(club));
    }
    setSeededKey(seedKey);
  }

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
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-4 sm:px-6 sm:pb-6"
    >
      <TabColumnsLayout columns="two">
        {/* Left column — Basic information: identity, contact and location.
            The club's photo is never
            independently editable here — it's always the owner's own
            Clerk-synced profile photo, shown wherever a club photo is
            displayed (e.g. ClubListPanel); changing it happens in Account
            Settings, not this form. */}
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              Basic information
            </h1>
            <p className="text-sm text-muted-foreground mt-1 text-pretty">
              Manage your club&apos;s profile and business details.
            </p>
          </div>

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

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <PhoneField control={control} errors={errors} />
            </div>
            <div className="flex-1">{countryField}</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              {/* No `*` in this label — unlike onboarding, this field is
                  optional here since an already-onboarded club may not have
                  set it yet; it only becomes required in practice once the
                  owner wants to enable bank transfer as a payment method. */}
              <PhoneField
                control={control}
                errors={errors}
                phoneFieldName="whatsappNumber"
                countryFieldName="whatsappCountry"
                label="WhatsApp (for payment receipts)"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">{provinceField}</div>
            <div className="flex-1">{cityField}</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Field>
                <FieldLabel htmlFor="club-zip-code">Zip code</FieldLabel>
                <Input
                  id="club-zip-code"
                  placeholder="1642"
                  {...register("zipCode")}
                  aria-invalid={!!errors.zipCode}
                />
                <FieldError errors={[errors.zipCode]} />
              </Field>
            </div>
            <div className="flex-1">
              <Field>
                <FieldLabel htmlFor="club-address">Address</FieldLabel>
                <Input
                  id="club-address"
                  placeholder="Av. Corrientes 1234"
                  {...register("address")}
                  aria-invalid={!!errors.address}
                />
                <FieldError errors={[errors.address]} />
              </Field>
            </div>
          </div>
        </>

        {/* Right column — Legal information: currently just Legal name/Tax
            ID, structured to leave room for more legal/billing fields later
            without needing to reshape the column layout. */}
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              Legal information
            </h1>
            <p className="text-sm text-muted-foreground mt-1 text-pretty">
              Used for invoices and tax documents.
            </p>
          </div>

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
        </>
      </TabColumnsLayout>

      <div>
        <Button type="submit" disabled={updateClub.isPending}>
          {updateClub.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

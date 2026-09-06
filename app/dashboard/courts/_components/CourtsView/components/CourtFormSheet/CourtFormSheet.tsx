"use client";

import { useEffect, useState } from "react";
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
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { GlobalLoadingOverlay } from "@/components/GlobalLoadingOverlay";
import { formatPricePerHour } from "@/lib/utils/currency";
import { MAX_COURT_PHOTO_SIZE_BYTES } from "@/core/courts/validation";
import {
  availabilityRowsToEntries,
  buildAvailabilityRows,
  courtToFormValues,
} from "../../utils";
import { useClubOperatingHours, useCourtAvailability } from "../../hooks";
import { courtFormSchema } from "./consts";
import { SurfaceField } from "./components/SurfaceField";
import { CourtTypeField } from "./components/CourtTypeField";
import { ColorField } from "./components/ColorField";
import { WallTypeField } from "./components/WallTypeField";
import { NetTypeField } from "./components/NetTypeField";
import { PhotoField } from "./components/PhotoField";
import { SlotDurationField } from "./components/SlotDurationField";
import { AvailabilityRowsEditor } from "@/components/AvailabilityRowsEditor";
import { CourtFormStepIndicator } from "./components/CourtFormStepIndicator";
import { CurrencyAmountField } from "@/components/CurrencyAmountField";
import type { AvailabilityDayRow, CourtFormValues } from "../../types";
import type { CourtFormSheetProps } from "./types";

// Derived (never hardcoded) so the upfront hint in the Photo field's legend
// can never drift from the actual server/client-enforced limit.
const MAX_COURT_PHOTO_MB = MAX_COURT_PHOTO_SIZE_BYTES / (1024 * 1024);

export function CourtFormSheet({
  open,
  onOpenChange,
  court,
  onSubmit,
  isSubmitting,
  initialStep = 0,
}: CourtFormSheetProps) {
  const isEditMode = Boolean(court);
  const courtId = court?.id ?? null;

  // Only relevant in create mode: a photo picked before the court exists
  // yet, staged here until the shared submit handler creates the court and
  // can upload it against a real courtId. Lives outside RHF state since a
  // File can't round-trip through the zod-validated form values.
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);

  const [step, setStep] = useState<0 | 1>(initialStep);

  // The weekly-schedule draft, now lifted up here so it can be submitted
  // together with the details form as one action. Seeded to all-days-
  // inactive placeholders until the relevant query below resolves.
  const [availabilityRows, setAvailabilityRows] = useState<
    AvailabilityDayRow[]
  >(() => buildAvailabilityRows([]));

  // Edit mode seeds from the court's own persisted availability; create mode
  // seeds from the club's default operating hours (Part 1's new endpoint) so
  // a brand-new court doesn't start from a blank week.
  const { data: courtAvailability } = useCourtAvailability(
    open ? courtId : null,
  );
  const { data: clubOperatingHours } = useClubOperatingHours(
    open && !isEditMode,
  );

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    control,
    setValue,
    formState: { errors, isValid, touchedFields, isSubmitted },
  } = useForm<CourtFormValues>({
    resolver: zodResolver(courtFormSchema),
    defaultValues: courtToFormValues(court),
    mode: "onChange",
  });

  // Re-seed the form whenever a different court is opened for editing (or
  // the sheet is reopened in create mode after a previous edit), and
  // recompute validity immediately so the submit button reflects the
  // re-seeded values without waiting for the user to touch a field. Also
  // resets which step the sheet opens on (the pencil/clock icons both open
  // this same sheet, just requesting a different starting step each time)
  // and resets the availability draft to its placeholder defaults — the
  // effect below re-seeds it for real once the relevant query resolves.
  //
  // Adjusted during render (comparing against a plain state value, not a
  // ref — this project's lint config forbids reading/writing refs during
  // render), not in a `useEffect`, since every value it sets is plain React
  // state — same "adjust state during render" idiom already established
  // elsewhere in this codebase (e.g. PlanSelectionModal's plan-sync block)
  // instead of the extra render pass a `useEffect` would cost. The key is
  // `null` while closed and `<courtId>|new` while open, so it changes on
  // open AND on switching to a different court while already open (clicking
  // a different row's pencil/clock without closing first) — `court`'s own
  // object identity isn't a reliable signal since a refetch can hand back a
  // new object for the same underlying court.
  // `seedKey` collapses to `null` on close, specifically so reopening for
  // the SAME court a second time still re-seeds (matching the original
  // effect's own "fires on every open" behavior) instead of comparing equal
  // to a stale `seededKey` left over from before the sheet closed.
  const seedKey = open ? (court?.id ?? "__create__") : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (seedKey !== seededKey) {
    if (seedKey !== null) {
      reset(courtToFormValues(court));
      trigger();
      setStep(initialStep ?? 0);
      setAvailabilityRows(buildAvailabilityRows([]));
    }
    setSeededKey(seedKey);
  }

  // Seeds the real availability draft once its source query resolves for
  // this open/court combination — a court's own CourtAvailability in edit
  // mode, or the club's default operating hours in create mode. This is a
  // genuine "sync state with an external async result" effect (the query
  // itself already only re-fetches on a real cache change), matching the
  // same sanctioned pattern already used in providers/auth-provider.tsx's
  // own profile-fetch effect.
  useEffect(() => {
    if (!open) return;
    if (isEditMode) {
      if (courtAvailability) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAvailabilityRows(buildAvailabilityRows(courtAvailability));
      }
    } else if (clubOperatingHours) {
      setAvailabilityRows(buildAvailabilityRows(clubOperatingHours));
    }
  }, [open, isEditMode, courtAvailability, clubOperatingHours]);

  // Clears a staged (not-yet-uploaded) create-mode photo whenever the sheet
  // closes, however that happens (Cancel, Escape, the built-in close
  // button) — not just on a successful submit — so a discarded selection
  // never lingers into the next time the sheet is opened. Wrapping
  // onOpenChange here (an event handler, not an effect) avoids the
  // set-state-in-effect footgun of resetting it from the re-seed effect above.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPendingPhotoFile(null);
    }
    onOpenChange(nextOpen);
  }

  const surface = useWatch({ control, name: "surface" });
  const indoor = useWatch({ control, name: "indoor" });
  const color = useWatch({ control, name: "color" });
  const wallType = useWatch({ control, name: "wallType" });
  const lighting = useWatch({ control, name: "lighting" });
  const netType = useWatch({ control, name: "netType" });
  const photoUrl = useWatch({ control, name: "photoUrl" });
  const slotDurationMinutes = useWatch({
    control,
    name: "slotDurationMinutes",
  });
  const reservationFee = useWatch({ control, name: "reservationFee" });
  const courtPrice = useWatch({ control, name: "courtPrice" });
  const active = useWatch({ control, name: "active" });

  // Ported from AvailabilityRowsEditor's old pre-save check: every active
  // day's end time must differ from its start time (a numerically-earlier
  // end time is a valid overnight window, e.g. 21:00-02:00). Factored into
  // the single submit button's disabled condition now that there's one
  // shared submit action instead of a separate "Save schedule" button.
  const isAvailabilityValid = availabilityRows.every(
    (row) => !row.active || row.endTime !== row.startTime,
  );

  async function submit(values: CourtFormValues) {
    try {
      await onSubmit(
        values,
        pendingPhotoFile,
        availabilityRowsToEntries(availabilityRows),
      );
    } catch {
      // onSubmit (handleFormSubmit) already surfaced its own error toast —
      // just keep the Sheet open with the same entered values and staged
      // photo so the owner can retry. Nothing here re-throws further: this
      // is called from a plain onClick (handleSubmit(submit)), so nothing
      // else is left to catch a re-thrown rejection — that would only leak
      // as an unhandled promise rejection in the console.
      return;
    }
    setPendingPhotoFile(null);
    handleOpenChange(false);
  }

  // `isValid` is kept current from the moment the sheet opens (see the
  // `trigger()` above) so Create/Save can be disabled right away, but a
  // field's error message should only surface once the user has actually
  // touched that field or tried to submit — otherwise a blank "New court"
  // form would show every required-field error before anyone typed a thing.
  function shownError(field: keyof CourtFormValues) {
    return touchedFields[field] || isSubmitted ? [errors[field]] : [];
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          onPointerDownOutside={(e) => e.preventDefault()}
          // Widened only for the Details step: its ~10 field groups made a
          // single default-width (~sm:max-w-sm) column unreasonably tall.
          // Per AGENTS.md's "Forms inside Drawers" convention — see the
          // two-column split below. The Availability step (step 1) keeps
          // the default width; its own content doesn't need the extra room.
          className={step === 0 ? "sm:max-w-2xl" : undefined}
        >
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit court" : "New court"}</SheetTitle>
            <SheetDescription>
              {isEditMode
                ? "Update this court's details."
                : "Add a new court to your club."}
            </SheetDescription>
          </SheetHeader>

          <CourtFormStepIndicator current={step} onChange={setStep} />

          {step === 0 ? (
            <form
              onSubmit={handleSubmit(submit)}
              className="flex flex-1 flex-col overflow-y-auto px-4"
            >
              {/*
                Two-column layout per AGENTS.md's "Forms inside Drawers"
                exception for wide drawers with many fields: each column
                stays single-field-per-line internally, grouped by logical
                relatedness (physical/descriptive attributes vs. commercial/
                scheduling attributes) rather than an arbitrary alternating
                split.
              */}
              <div className="flex flex-1 gap-4">
                <div className="flex flex-1 flex-col gap-4">
                  {/* Plain heading, not FieldLegend — a <legend> is only
                      valid inside a <fieldset>, and this is a column
                      heading spanning several fieldsets, not one. */}
                  <h3 className="text-sm font-semibold text-foreground">
                    Court details
                  </h3>

                  <Field>
                    <FieldLabel htmlFor="court-name">Name *</FieldLabel>
                    <Input
                      id="court-name"
                      placeholder="Court 1"
                      {...register("name")}
                      aria-invalid={
                        (touchedFields.name || isSubmitted) && !!errors.name
                      }
                    />
                    <FieldError errors={shownError("name")} />
                  </Field>

                  <FieldSet>
                    <FieldLegend variant="label">Surface *</FieldLegend>
                    <SurfaceField
                      name="court-surface"
                      value={surface}
                      onChange={(value) =>
                        setValue("surface", value, {
                          shouldValidate: true,
                          shouldTouch: true,
                        })
                      }
                    />
                    <FieldError errors={shownError("surface")} />
                  </FieldSet>

                  <FieldSet>
                    <FieldLegend variant="label">
                      Photo (max {MAX_COURT_PHOTO_MB}MB)
                    </FieldLegend>
                    <PhotoField
                      courtId={court?.id}
                      value={photoUrl}
                      onChange={(value) =>
                        setValue("photoUrl", value, { shouldTouch: true })
                      }
                      onFileStaged={setPendingPhotoFile}
                    />
                  </FieldSet>

                  <FieldSet>
                    <FieldLegend variant="label">Court type</FieldLegend>
                    <CourtTypeField
                      name="court-type"
                      indoor={indoor}
                      onChange={(value) =>
                        setValue("indoor", value, { shouldTouch: true })
                      }
                    />
                  </FieldSet>

                  <FieldSet>
                    <FieldLegend variant="label">Color</FieldLegend>
                    <ColorField
                      name="court-color"
                      value={color}
                      onChange={(value) =>
                        setValue("color", value, {
                          shouldValidate: true,
                          shouldTouch: true,
                        })
                      }
                    />
                  </FieldSet>

                  <FieldSet>
                    <FieldLegend variant="label">Wall type</FieldLegend>
                    <WallTypeField
                      name="court-wall-type"
                      value={wallType ?? ""}
                      onChange={(value) =>
                        setValue("wallType", value, { shouldTouch: true })
                      }
                    />
                  </FieldSet>

                  <FieldSet>
                    <FieldLegend variant="label">Net type</FieldLegend>
                    <NetTypeField
                      name="court-net-type"
                      value={netType ?? ""}
                      onChange={(value) =>
                        setValue("netType", value, { shouldTouch: true })
                      }
                    />
                  </FieldSet>

                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="court-lighting">
                      Has lighting
                    </FieldLabel>
                    <Switch
                      id="court-lighting"
                      checked={lighting}
                      onCheckedChange={(checked) =>
                        setValue("lighting", checked, { shouldTouch: true })
                      }
                    />
                  </Field>
                </div>

                <Separator orientation="vertical" />

                <div className="flex flex-1 flex-col gap-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Booking &amp; pricing
                  </h3>

                  <Field>
                    <FieldLabel htmlFor="court-slot-duration">
                      Minimum shift *
                    </FieldLabel>
                    <SlotDurationField
                      id="court-slot-duration"
                      value={slotDurationMinutes}
                      onChange={(value) =>
                        setValue("slotDurationMinutes", value, {
                          shouldValidate: true,
                          shouldTouch: true,
                        })
                      }
                      ariaInvalid={
                        (touchedFields.slotDurationMinutes || isSubmitted) &&
                        !!errors.slotDurationMinutes
                      }
                    />
                    <FieldDescription>
                      The shortest amount of time a player can book this court
                      for.
                    </FieldDescription>
                    <FieldError errors={shownError("slotDurationMinutes")} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="court-reservation-fee">
                      Reservation fee *
                    </FieldLabel>
                    <CurrencyAmountField
                      id="court-reservation-fee"
                      value={reservationFee}
                      // Cast past the required `number`: the field can sit
                      // briefly empty while typing, which is exactly what
                      // makes it invalid (and Create disabled) until the
                      // user fills it in.
                      onChange={(value) =>
                        setValue("reservationFee", value as number, {
                          shouldValidate: true,
                          shouldTouch: true,
                        })
                      }
                      ariaInvalid={
                        (touchedFields.reservationFee || isSubmitted) &&
                        !!errors.reservationFee
                      }
                    />
                    <FieldError errors={shownError("reservationFee")} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="court-price">Court price</FieldLabel>
                    <CurrencyAmountField
                      id="court-price"
                      value={courtPrice}
                      onChange={(value) =>
                        setValue("courtPrice", value, { shouldTouch: true })
                      }
                    />
                    <FieldDescription>
                      $/hour:{" "}
                      {formatPricePerHour(courtPrice, slotDurationMinutes)}
                    </FieldDescription>
                  </Field>

                  {isEditMode && (
                    <Field orientation="horizontal">
                      <FieldLabel htmlFor="court-active">Active</FieldLabel>
                      <Switch
                        id="court-active"
                        checked={active}
                        onCheckedChange={(checked) =>
                          setValue("active", checked)
                        }
                      />
                    </Field>
                  )}
                </div>
              </div>
            </form>
          ) : (
            <div className="flex flex-1 flex-col overflow-y-auto px-4">
              <AvailabilityRowsEditor
                rows={availabilityRows}
                onChange={setAvailabilityRows}
              />
            </div>
          )}

          <SheetFooter>
            <Button
              type="button"
              onClick={handleSubmit(submit)}
              disabled={isSubmitting || !isValid || !isAvailabilityValid}
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

      <GlobalLoadingOverlay open={isSubmitting} label="Saving…" />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
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

// Which of courtFormSchema's required fields live on each step — used to
// gate Next so it can't advance past a step whose own required fields
// aren't filled in yet. Step 3 (Availability) has no required RHF fields of
// its own; it's gated by isAvailabilityValid instead, on the Create/Save
// button directly.
function requiredFieldsForStep(
  currentStep: 0 | 1 | 2 | 3,
): (keyof CourtFormValues)[] {
  switch (currentStep) {
    case 0:
      return ["name"];
    case 1:
      return ["surface", "color"];
    case 2:
      return ["slotDurationMinutes", "reservationFee"];
    default:
      return [];
  }
}

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

  const [step, setStep] = useState<0 | 1 | 2 | 3>(initialStep);
  const isLastStep = step === 3;

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
  // the modal is reopened in create mode after a previous edit), and
  // recompute validity immediately so the submit button reflects the
  // re-seeded values without waiting for the user to touch a field. Also
  // resets which step the modal opens on (the pencil/clock icons both open
  // this same modal, just requesting a different starting step each time)
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
  // to a stale `seededKey` left over from before the modal closed.
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

  // Clears a staged (not-yet-uploaded) create-mode photo whenever the modal
  // closes, however that happens (Cancel, Escape, the built-in close
  // button) — not just on a successful submit — so a discarded selection
  // never lingers into the next time the modal is opened. Wrapping
  // onOpenChange here (an event handler, not an effect) avoids the
  // set-state-in-effect footgun of resetting it from the re-seed effect above.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPendingPhotoFile(null);
    }
    onOpenChange(nextOpen);
  }

  // Kept current from the moment the modal opens (`errors` is populated by
  // the `trigger()` call in the re-seed block above, not just once a field
  // is touched) — same reasoning as `isValid` below, so a fresh step's
  // Next starts disabled instead of only disabling after the owner leaves
  // its first empty required field.
  const isCurrentStepValid = requiredFieldsForStep(step).every(
    (field) => !errors[field],
  );

  // Back is always free — only Next is gated, on isCurrentStepValid above
  // (the current step's own required fields, see requiredFieldsForStep).
  // Steps only ever move via these two functions now, never by clicking the
  // step indicator directly (see CourtFormStepIndicator — no longer
  // clickable, matching every other step indicator in the app).
  function handleNext() {
    setStep((s) => (s < 3 ? ((s + 1) as 0 | 1 | 2 | 3) : s));
  }

  function handleBack() {
    setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2 | 3) : s));
  }

  // Shared by the primary button's onClick and every step's own <form
  // onSubmit> (so pressing Enter in e.g. the Name field on step 0 advances
  // instead of immediately submitting the whole court) — advances on every
  // step except the last, where it runs the real submit instead. The
  // isCurrentStepValid guard here (not just the button's own `disabled`)
  // is what actually blocks the Enter-key path too, since a form's
  // onSubmit fires regardless of whether its own submit button is
  // disabled.
  function goToNextOrSubmit() {
    if (isLastStep) {
      void handleSubmit(submit)();
    } else if (isCurrentStepValid) {
      handleNext();
    }
  }

  function handleStepFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    goToNextOrSubmit();
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
      // just keep the modal open with the same entered values and staged
      // photo so the owner can retry. Nothing here re-throws further: this
      // is called from a plain onClick (handleSubmit(submit)), so nothing
      // else is left to catch a re-thrown rejection — that would only leak
      // as an unhandled promise rejection in the console.
      return;
    }
    setPendingPhotoFile(null);
    handleOpenChange(false);
  }

  // `isValid` is kept current from the moment the modal opens (see the
  // `trigger()` above) so Create/Save can be disabled right away, but a
  // field's error message should only surface once the user has actually
  // touched that field or tried to submit — otherwise a blank "New court"
  // form would show every required-field error before anyone typed a thing.
  function shownError(field: keyof CourtFormValues) {
    return touchedFields[field] || isSubmitted ? [errors[field]] : [];
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          // A centered modal, not a side drawer. Fixed size (h-, not
          // max-h-, and no per-step width) regardless of which step is
          // showing — the modal never resizes as the owner moves through
          // it. Each step was split specifically so its own content fits
          // this fixed height without needing its own vertical scroll (the
          // Availability step's day list is the one deliberate exception —
          // see its own "split" layout below).
          className="flex h-[70vh] w-full flex-col sm:max-w-4xl"
        >
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit court" : "New court"}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update this court's details."
                : "Add a new court to your club."}
            </DialogDescription>
          </DialogHeader>

          <CourtFormStepIndicator current={step} />

          {/*
            All four steps stay mounted the whole time (visibility toggled
            via `hidden`, never conditionally rendered) — PhotoField (and
            any other field with its own local preview/derived state) would
            otherwise lose that state every time its step unmounted while
            navigating away and remounted coming back, even though the
            actual form values (held centrally by react-hook-form) were
            never actually lost.
          */}
          <form
            onSubmit={handleStepFormSubmit}
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-y-auto",
              step !== 0 && "hidden",
            )}
          >
            {/* Narrower, centered content: name/number/photo don't need the
                full modal width, and a wide single-column form here just
                reads as a lot of empty margin either side. */}
            <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
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

              <Field>
                <FieldLabel htmlFor="court-number">Court number</FieldLabel>
                <Input
                  id="court-number"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="1"
                  {...register("courtNumber", {
                    // Not valueAsNumber: an empty field would report NaN,
                    // not undefined, and z.number() rejects NaN even
                    // through .optional() — that would leave Create/Save
                    // permanently disabled on this optional field until the
                    // owner typed something into it.
                    setValueAs: (value) =>
                      value === "" ? undefined : Number(value),
                  })}
                />
              </Field>

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
            </div>
          </form>

          <form
            onSubmit={handleStepFormSubmit}
            className={cn(
              "flex min-h-0 flex-1 gap-6 overflow-y-auto px-6",
              step !== 1 && "hidden",
            )}
          >
            {/* Two columns (see AGENTS.md's "wide drawers with many fields"
                exception): left is the court's core physical build,
                right its secondary/optional characteristics — enough
                fields that one column would need its own vertical scroll
                otherwise. */}
            <div className="flex flex-1 flex-col gap-4">
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
            </div>

            <Separator orientation="vertical" />

            <div className="flex flex-1 flex-col gap-4">
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
                <FieldLabel htmlFor="court-lighting">Has lighting</FieldLabel>
                <Switch
                  id="court-lighting"
                  checked={lighting}
                  onCheckedChange={(checked) =>
                    setValue("lighting", checked, { shouldTouch: true })
                  }
                />
              </Field>
            </div>
          </form>

          <form
            onSubmit={handleStepFormSubmit}
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-y-auto",
              step !== 2 && "hidden",
            )}
          >
            {/* Same narrower, centered treatment as the Details step —
                pricing/duration inputs don't need the full modal width
                either. */}
            <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
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
                  The shortest amount of time a player can book this court for.
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
                  // briefly empty while typing, which is exactly what makes
                  // it invalid (and Create disabled) until the user fills
                  // it in.
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
                  $/hour: {formatPricePerHour(courtPrice, slotDurationMinutes)}
                </FieldDescription>
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
            </div>
          </form>

          <form
            onSubmit={handleStepFormSubmit}
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              step !== 3 && "hidden",
            )}
          >
            <AvailabilityRowsEditor
              rows={availabilityRows}
              onChange={setAvailabilityRows}
              layout="split"
            />
          </form>

          <DialogFooter className="sm:justify-between">
            <div>
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="min-w-28"
                >
                  Back
                </Button>
              )}
            </div>
            <Button
              type="button"
              onClick={goToNextOrSubmit}
              disabled={
                isLastStep
                  ? isSubmitting || !isValid || !isAvailabilityValid
                  : !isCurrentStepValid
              }
              className="min-w-28 gap-1.5"
            >
              {!isLastStep ? (
                "Next"
              ) : isSubmitting ? (
                "Saving…"
              ) : isEditMode ? (
                "Save changes"
              ) : (
                <>
                  <Plus className="size-4" />
                  Create court
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GlobalLoadingOverlay open={isSubmitting} label="Saving…" />
    </>
  );
}

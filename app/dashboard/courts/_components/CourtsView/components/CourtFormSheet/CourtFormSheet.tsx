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
import { formatPricePerHour } from "@/lib/utils/currency";
import { courtToFormValues } from "../../utils";
import { courtFormSchema } from "./consts";
import { SurfaceField } from "./components/SurfaceField";
import { CourtTypeField } from "./components/CourtTypeField";
import { ColorField } from "./components/ColorField";
import { PhotoField } from "./components/PhotoField";
import { SlotDurationField } from "./components/SlotDurationField";
import { CurrencyAmountField } from "@/components/CurrencyAmountField";
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

  // Only relevant in create mode: a photo picked before the court exists
  // yet, staged here until the shared submit handler creates the court and
  // can upload it against a real courtId. Lives outside RHF state since a
  // File can't round-trip through the zod-validated form values.
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);

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
  // re-seeded values without waiting for the user to touch a field.
  useEffect(() => {
    if (open) {
      reset(courtToFormValues(court));
      trigger();
    }
  }, [open, court, reset, trigger]);

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
  const photoUrl = useWatch({ control, name: "photoUrl" });
  const slotDurationMinutes = useWatch({
    control,
    name: "slotDurationMinutes",
  });
  const reservationFee = useWatch({ control, name: "reservationFee" });
  const courtPrice = useWatch({ control, name: "courtPrice" });
  const active = useWatch({ control, name: "active" });

  async function submit(values: CourtFormValues) {
    await onSubmit(values, pendingPhotoFile);
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
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent onPointerDownOutside={(e) => e.preventDefault()}>
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
            <FieldLegend variant="label">Photo</FieldLegend>
            <PhotoField
              courtId={court?.id}
              value={photoUrl}
              onChange={(value) =>
                setValue("photoUrl", value, { shouldTouch: true })
              }
              onFileStaged={setPendingPhotoFile}
            />
          </FieldSet>

          <div className="flex gap-4">
            <FieldSet className="flex-1">
              <FieldLegend variant="label">Court type</FieldLegend>
              <CourtTypeField
                name="court-type"
                indoor={indoor}
                onChange={(value) =>
                  setValue("indoor", value, { shouldTouch: true })
                }
              />
            </FieldSet>

            <FieldSet className="flex-1">
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

          <div className="flex gap-4">
            <Field className="flex-1">
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

            <Field className="flex-1">
              <FieldLabel htmlFor="court-reservation-fee">
                Reservation fee *
              </FieldLabel>
              <CurrencyAmountField
                id="court-reservation-fee"
                value={reservationFee}
                // Cast past the required `number`: the field can sit briefly
                // empty while typing, which is exactly what makes it invalid
                // (and Create disabled) until the user fills it in.
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
          </div>

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
        </form>

        <SheetFooter>
          <Button
            type="button"
            onClick={handleSubmit(submit)}
            disabled={isSubmitting || !isValid}
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

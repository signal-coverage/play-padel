"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useUpdateCourt } from "../../hooks";
import { SurfaceField } from "../CourtFormSheet/components/SurfaceField";
import { CourtTypeField } from "../CourtFormSheet/components/CourtTypeField";
import { ColorField } from "../CourtFormSheet/components/ColorField";
import { DEFAULT_VALUES, bulkEditFormSchema } from "./consts";
import type { UpdateCourtInput } from "@/core/courts/types";
import type { BulkEditCourtsSheetProps, BulkEditFormValues } from "./types";

export function BulkEditCourtsSheet({
  open,
  onOpenChange,
  courtIds,
  courtCount,
  onSuccess,
}: BulkEditCourtsSheetProps) {
  const updateCourt = useUpdateCourt();

  const { register, handleSubmit, reset, control, setValue } =
    useForm<BulkEditFormValues>({
      resolver: zodResolver(bulkEditFormSchema),
      defaultValues: DEFAULT_VALUES,
    });

  // Re-seeds the form to its all-disabled defaults every time the sheet
  // (re)opens for a fresh selection, using the same render-time
  // state-comparison idiom CourtFormSheet uses (see its seedKey/seededKey
  // comment) instead of a useEffect setState, which this project's ESLint
  // config (react-hooks/set-state-in-effect) forbids.
  const [seededOpen, setSeededOpen] = useState(false);
  if (open !== seededOpen) {
    if (open) {
      reset(DEFAULT_VALUES);
    }
    setSeededOpen(open);
  }

  const surfaceEnabled = useWatch({ control, name: "surface.enabled" });
  const surfaceValue = useWatch({ control, name: "surface.value" });
  const indoorEnabled = useWatch({ control, name: "indoor.enabled" });
  const indoorValue = useWatch({ control, name: "indoor.value" });
  const colorEnabled = useWatch({ control, name: "color.enabled" });
  const colorValue = useWatch({ control, name: "color.value" });
  const slotDurationEnabled = useWatch({
    control,
    name: "slotDurationMinutes.enabled",
  });
  const reservationFeeEnabled = useWatch({
    control,
    name: "reservationFee.enabled",
  });
  const courtPriceEnabled = useWatch({ control, name: "courtPrice.enabled" });
  const activeEnabled = useWatch({ control, name: "active.enabled" });
  const activeValue = useWatch({ control, name: "active.value" });

  async function submit(values: BulkEditFormValues) {
    const input: UpdateCourtInput = {
      ...(values.surface.enabled ? { surface: values.surface.value } : {}),
      ...(values.indoor.enabled ? { indoor: values.indoor.value } : {}),
      ...(values.color.enabled ? { color: values.color.value } : {}),
      ...(values.slotDurationMinutes.enabled
        ? { slotDurationMinutes: values.slotDurationMinutes.value }
        : {}),
      ...(values.reservationFee.enabled
        ? { reservationFee: values.reservationFee.value }
        : {}),
      ...(values.courtPrice.enabled
        ? { courtPrice: values.courtPrice.value }
        : {}),
      ...(values.active.enabled ? { active: values.active.value } : {}),
    };

    if (Object.keys(input).length === 0) {
      toast.error("Select at least one field to change");
      return;
    }

    // Mirrors ClosuresSheet's handleCreate: fan the same single-court
    // mutation out to every selected court via Promise.allSettled, then
    // reduce the per-court outcomes into one summary toast. There is no
    // dedicated bulk-update endpoint — see useUpdateCourt in ../../hooks.ts.
    const results = await Promise.allSettled(
      courtIds.map((courtId) =>
        updateCourt.mutateAsync({ courtId, input, silent: true }),
      ),
    );
    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );

    if (failures.length === 0) {
      toast.success(`Updated ${courtIds.length} courts`);
      onSuccess();
      onOpenChange(false);
    } else if (failures.length === courtIds.length) {
      toast.error(
        failures[0].reason instanceof Error
          ? failures[0].reason.message
          : "Failed to update courts",
      );
    } else {
      toast.error(
        `Updated ${courtIds.length - failures.length} of ${courtIds.length} courts. ${failures.length} failed.`,
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onPointerDownOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Bulk edit courts</SheetTitle>
          <SheetDescription>
            Editing {courtCount} courts. Only checked fields will be changed.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(submit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-surface-enabled"
                checked={surfaceEnabled}
                onCheckedChange={(checked) =>
                  setValue("surface.enabled", Boolean(checked))
                }
              />
              <label
                htmlFor="bulk-surface-enabled"
                className="text-sm font-medium"
              >
                Surface
              </label>
            </div>
            <fieldset disabled={!surfaceEnabled} className="contents">
              <SurfaceField
                name="bulk-edit-surface"
                value={surfaceValue}
                onChange={(value) => setValue("surface.value", value)}
              />
            </fieldset>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-indoor-enabled"
                checked={indoorEnabled}
                onCheckedChange={(checked) =>
                  setValue("indoor.enabled", Boolean(checked))
                }
              />
              <label
                htmlFor="bulk-indoor-enabled"
                className="text-sm font-medium"
              >
                Court type
              </label>
            </div>
            <fieldset disabled={!indoorEnabled} className="contents">
              <CourtTypeField
                name="bulk-edit-court-type"
                indoor={indoorValue}
                onChange={(value) => setValue("indoor.value", value)}
              />
            </fieldset>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-color-enabled"
                checked={colorEnabled}
                onCheckedChange={(checked) =>
                  setValue("color.enabled", Boolean(checked))
                }
              />
              <label
                htmlFor="bulk-color-enabled"
                className="text-sm font-medium"
              >
                Color
              </label>
            </div>
            <fieldset disabled={!colorEnabled} className="contents">
              <ColorField
                name="bulk-edit-color"
                value={colorValue}
                onChange={(value) => setValue("color.value", value)}
              />
            </fieldset>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-slot-duration-enabled"
                aria-label="Minimum shift"
                checked={slotDurationEnabled}
                onCheckedChange={(checked) =>
                  setValue("slotDurationMinutes.enabled", Boolean(checked))
                }
              />
              <label
                htmlFor="bulk-slot-duration-input"
                className="text-sm font-medium"
              >
                Minimum shift
              </label>
            </div>
            <Input
              id="bulk-slot-duration-input"
              type="number"
              disabled={!slotDurationEnabled}
              {...register("slotDurationMinutes.value", {
                valueAsNumber: true,
              })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-reservation-fee-enabled"
                aria-label="Reservation fee"
                checked={reservationFeeEnabled}
                onCheckedChange={(checked) =>
                  setValue("reservationFee.enabled", Boolean(checked))
                }
              />
              <label
                htmlFor="bulk-reservation-fee-input"
                className="text-sm font-medium"
              >
                Reservation fee
              </label>
            </div>
            <Input
              id="bulk-reservation-fee-input"
              type="number"
              disabled={!reservationFeeEnabled}
              {...register("reservationFee.value", { valueAsNumber: true })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-court-price-enabled"
                aria-label="Court price"
                checked={courtPriceEnabled}
                onCheckedChange={(checked) =>
                  setValue("courtPrice.enabled", Boolean(checked))
                }
              />
              <label
                htmlFor="bulk-court-price-input"
                className="text-sm font-medium"
              >
                Court price
              </label>
            </div>
            <Input
              id="bulk-court-price-input"
              type="number"
              disabled={!courtPriceEnabled}
              {...register("courtPrice.value", { valueAsNumber: true })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-active-enabled"
                aria-label="Active"
                checked={activeEnabled}
                onCheckedChange={(checked) =>
                  setValue("active.enabled", Boolean(checked))
                }
              />
              <label
                htmlFor="bulk-active-switch"
                className="text-sm font-medium"
              >
                Active
              </label>
            </div>
            <Switch
              id="bulk-active-switch"
              checked={activeValue}
              disabled={!activeEnabled}
              onCheckedChange={(checked) => setValue("active.value", checked)}
            />
          </div>
        </form>

        <SheetFooter>
          <Button
            type="button"
            onClick={handleSubmit(submit)}
            disabled={updateCourt.isPending}
          >
            {updateCourt.isPending ? "Saving…" : "Apply changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

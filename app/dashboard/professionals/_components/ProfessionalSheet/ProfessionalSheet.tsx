"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { cn } from "@/lib/utils/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxValue,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlugins } from "@/providers/plugin-provider";
import type { PluginManifest } from "@/core/plugins/types";
import {
  createProfessional,
  updateProfessional,
  createWorkingHours,
  deleteWorkingHours,
  getWorkingHours,
} from "@/app/actions/professionals";
import { WorkingHoursSection } from "@/app/dashboard/professionals/_components/WorkingHoursSection";
import { getInitialValues } from "./utils";
import type { ProfessionalSheetProps, ProfessionalFormValues } from "./types";
import { ACADEMIC_TITLES, CALENDAR_COLORS } from "./consts";

const professionalFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  specialties: z.array(z.string()),
  license: z.string(),
  phone: z.string(),
  email: z.string(),
  calendarColor: z.string(),
  workingHours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
    }),
  ),
});

export function ProfessionalSheet({
  open,
  onOpenChange,
  professional,
  existingWorkingHours,
  onSuccess,
}: ProfessionalSheetProps) {
  const isEdit = !!professional;
  const { enabledManifests } = usePlugins();
  const specialtiesAnchor = useComboboxAnchor();

  const [pronoun, setPronoun] = useState("");
  const [fullName, setFullName] = useState("");

  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalFormSchema),
    defaultValues: getInitialValues(professional, existingWorkingHours),
  });

  useEffect(() => {
    if (open) {
      if (isEdit && professional && !existingWorkingHours) {
        getWorkingHours(professional.id).then((result) => {
          if (result.success) {
            form.reset(getInitialValues(professional, result.data));
          }
        });
      } else {
        form.reset(getInitialValues(professional, existingWorkingHours));
      }
      if (isEdit && professional) {
        const displayName = professional.displayName ?? "";
        const matchedTitle = ACADEMIC_TITLES.find((t) =>
          displayName.startsWith(t + " "),
        );
        if (matchedTitle) {
          setPronoun(matchedTitle);
          setFullName(displayName.slice(matchedTitle.length + 1));
        } else {
          setPronoun("");
          setFullName(displayName);
        }
      }
    }
  }, [open, professional, existingWorkingHours, isEdit, form]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPronoun("");
      setFullName("");
    }
    onOpenChange(next);
  }

  function handlePronounChange(value: string) {
    const next = value === "__none__" ? "" : value;
    setPronoun(next);
    const parts = [next, fullName].filter(Boolean);
    form.setValue("displayName", parts.join(" "), { shouldValidate: true });
  }

  function handleFullNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFullName(e.target.value);
    const parts = [pronoun, e.target.value].filter(Boolean);
    form.setValue("displayName", parts.join(" "), { shouldValidate: true });
  }

  async function handleSubmit(values: ProfessionalFormValues) {
    const payload = {
      displayName: values.displayName,
      specialties: values.specialties,
      license: values.license || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      calendarColor: values.calendarColor || undefined,
    };

    try {
      let professionalId: string;

      if (isEdit && professional) {
        const result = await updateProfessional(professional.id, payload);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        professionalId = professional.id;

        // Sync working hours: delete all existing, re-create current entries
        const existing = await getWorkingHours(professionalId);
        if (existing.success) {
          await Promise.all(
            existing.data.map((wh) => deleteWorkingHours(wh.id)),
          );
        }
      } else {
        const result = await createProfessional(payload);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        professionalId = result.data.id;
      }

      // Create all working hours entries
      await Promise.all(
        values.workingHours.map((wh) =>
          createWorkingHours(professionalId, {
            dayOfWeek: wh.dayOfWeek,
            startTime: wh.startTime,
            endTime: wh.endTime,
            active: true,
          }),
        ),
      );

      toast.success(isEdit ? "Professional updated" : "Professional created");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred");
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit Professional" : "New Professional"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the professional's information."
              : "Fill in the details to create a new professional."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4 px-4 py-2"
        >
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <Label>Title</Label>
              <Select
                value={pronoun || "__none__"}
                onValueChange={handlePronounChange}
              >
                <SelectTrigger className="w-24 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {ACADEMIC_TITLES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={handleFullNameChange}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="displayName">Display name *</Label>
            <Input
              id="displayName"
              {...form.register("displayName")}
              aria-invalid={!!form.formState.errors.displayName}
            />
            {form.formState.errors.displayName && (
              <p className="text-xs text-destructive">
                {form.formState.errors.displayName.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label>Specialties</Label>
            <Controller
              control={form.control}
              name="specialties"
              render={({ field }) => {
                const selectedManifests = field.value
                  .map((id) => enabledManifests.find((m) => m.id === id))
                  .filter((m): m is PluginManifest => m !== undefined);
                return (
                  <Combobox
                    items={enabledManifests}
                    multiple
                    value={selectedManifests}
                    onValueChange={(next: PluginManifest[]) =>
                      field.onChange(next.map((m) => m.id))
                    }
                    itemToStringLabel={(m: PluginManifest) => m.name}
                    isItemEqualToValue={(
                      item: PluginManifest,
                      value: PluginManifest,
                    ) => item.id === value.id}
                  >
                    <ComboboxChips ref={specialtiesAnchor}>
                      <ComboboxValue>
                        {(value: PluginManifest[]) => (
                          <>
                            {value.map((m) => (
                              <ComboboxChip key={m.id}>{m.name}</ComboboxChip>
                            ))}
                            <ComboboxChipsInput
                              placeholder={
                                value.length === 0
                                  ? "Select specialties..."
                                  : undefined
                              }
                            />
                          </>
                        )}
                      </ComboboxValue>
                    </ComboboxChips>
                    <ComboboxContent anchor={specialtiesAnchor}>
                      <ComboboxEmpty>No specialties found.</ComboboxEmpty>
                      <ComboboxList>
                        {(manifest: PluginManifest) => (
                          <ComboboxItem key={manifest.id} value={manifest}>
                            {manifest.name}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                );
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="license">License</Label>
            <Input id="license" {...form.register("license")} />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...form.register("phone")} />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Calendar color</Label>
            <Controller
              control={form.control}
              name="calendarColor"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2 pt-1">
                  {CALENDAR_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      title={color.label}
                      onClick={() => field.onChange(color.value)}
                      className={cn(
                        "size-7 rounded-full border-2 transition-all hover:scale-110",
                        field.value === color.value
                          ? "border-foreground scale-110"
                          : "border-transparent",
                      )}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              )}
            />
          </div>

          <div className="border-t pt-4">
            <WorkingHoursSection control={form.control} />
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Create professional"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

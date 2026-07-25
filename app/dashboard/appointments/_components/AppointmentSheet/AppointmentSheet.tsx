"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils/utils";
import {
  createAppointment,
  updateAppointment,
} from "@/app/actions/appointments";
import { getPatients } from "@/app/actions/patients";
import { getProfessionals } from "@/app/actions/professionals";
import { getInitialValues, isPastDateTime } from "./utils";
import type { AppointmentSheetProps, AppointmentFormValues } from "./types";
import { HOURS, MINUTES, DURATION_OPTIONS } from "./consts";

const appointmentFormSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  professionalId: z.string(),
  scheduledStart: z.string().min(1, "Start date/time is required"),
  durationMinutes: z.number().min(1, "Duration is required"),
  reason: z.string(),
  location: z.string(),
  notes: z.string(),
});

export function AppointmentSheet({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  onSuccess,
}: AppointmentSheetProps) {
  const isEdit = !!appointment;
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: getInitialValues(appointment, defaultDate),
  });

  const scheduledStart = useWatch({
    control: form.control,
    name: "scheduledStart",
  });
  const showPastWarning = isPastDateTime(scheduledStart);

  useEffect(() => {
    if (!open) return;
    form.reset(getInitialValues(appointment, defaultDate));
  }, [open, appointment, defaultDate, form]);

  async function handleSubmit(values: AppointmentFormValues) {
    const startUtc = new Date(values.scheduledStart + ":00.000Z");
    const endUtc = new Date(startUtc.getTime() + values.durationMinutes * 60 * 1000);

    const payload = {
      patientId: values.patientId,
      professionalId: values.professionalId || undefined,
      scheduledStart: startUtc.toISOString(),
      scheduledEnd: endUtc.toISOString(),
      reason: values.reason || undefined,
      location: values.location || undefined,
      notes: values.notes || undefined,
    };

    try {
      const result = isEdit
        ? await updateAppointment(appointment!.id, payload)
        : await createAppointment(payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Appointment updated" : "Appointment created");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit Appointment" : "New Appointment"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the appointment details."
              : "Schedule a new appointment."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4 px-4 py-2"
        >
          <div className="flex flex-col gap-1">
            <Label>Patient *</Label>
            <Controller
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Search patients..."
                  className={
                    form.formState.errors.patientId
                      ? "border-destructive"
                      : undefined
                  }
                  onSearch={async (q) => {
                    const r = await getPatients({
                      search: q,
                      status: "ACTIVE",
                      pageSize: 10,
                    });
                    if (!r.success) return [];
                    return r.data.data.map((p) => ({
                      id: p.id,
                      label: `${p.firstName} ${p.lastName}`,
                    }));
                  }}
                />
              )}
            />
            {form.formState.errors.patientId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.patientId.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label>Professional</Label>
            <Controller
              control={form.control}
              name="professionalId"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value ?? ""}
                  displayValue={!field.value ? "None" : undefined}
                  onValueChange={field.onChange}
                  placeholder="Search professionals..."
                  onSearch={async (q) => {
                    const r = await getProfessionals({
                      search: q,
                      active: true,
                      pageSize: 10,
                    });
                    if (!r.success) return [];
                    return [
                      { id: "", label: "None" },
                      ...r.data.data.map((p) => ({
                        id: p.id,
                        label: p.displayName,
                      })),
                    ];
                  }}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Start *</Label>
            <Controller
              control={form.control}
              name="scheduledStart"
              render={({ field }) => {
                const datePart = field.value?.split("T")[0] ?? "";
                const timePart =
                  field.value?.split("T")[1]?.slice(0, 5) ?? "09:00";
                const selected = datePart
                  ? new Date(datePart + "T12:00:00")
                  : undefined;
                return (
                  <div className="flex gap-2">
                    <Popover
                      open={startCalendarOpen}
                      onOpenChange={setStartCalendarOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !datePart && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {datePart ? format(selected!, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selected}
                          onSelect={(date) => {
                            if (!date) return;
                            field.onChange(
                              format(date, "yyyy-MM-dd") + "T" + timePart,
                            );
                            setStartCalendarOpen(false);
                          }}
                          captionLayout="dropdown"
                          defaultMonth={selected}
                        />
                      </PopoverContent>
                    </Popover>
                    <TimePicker
                      value={timePart}
                      onChange={(t) =>
                        field.onChange(
                          (datePart || format(new Date(), "yyyy-MM-dd")) +
                            "T" +
                            t,
                        )
                      }
                    />
                  </div>
                );
              }}
            />
            {form.formState.errors.scheduledStart && (
              <p className="text-xs text-destructive">
                {form.formState.errors.scheduledStart.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label>Duration *</Label>
            <Controller
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger
                    className={cn(
                      form.formState.errors.durationMinutes &&
                        "border-destructive",
                    )}
                  >
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.durationMinutes && (
              <p className="text-xs text-destructive">
                {form.formState.errors.durationMinutes.message}
              </p>
            )}
          </div>

          {showPastWarning && (
            <p className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
              The start time is in the past. You can still save the appointment.
            </p>
          )}

          <div className="flex flex-col gap-1">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" {...form.register("reason")} />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...form.register("location")} />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              rows={3}
              className="resize-none"
              placeholder="Optional notes..."
            />
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
                  : "Create appointment"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [h = "09", m = "00"] = value.split(":");

  return (
    <div className="flex items-center gap-1">
      <Select value={h} onValueChange={(v) => onChange(v + ":" + m)}>
        <SelectTrigger className="h-9 w-16 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((hour) => (
            <SelectItem key={hour} value={hour}>
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm font-medium text-muted-foreground">:</span>
      <Select value={m} onValueChange={(v) => onChange(h + ":" + v)}>
        <SelectTrigger className="h-9 w-16 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((min) => (
            <SelectItem key={min} value={min}>
              {min}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

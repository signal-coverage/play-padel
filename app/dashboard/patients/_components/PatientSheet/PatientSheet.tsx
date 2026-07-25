"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/utils";
import { createPatient, updatePatient } from "@/app/actions/patients";
import type { PatientSheetProps, PatientFormValues } from "./types";
import { patientFormSchema } from "./types";
import { getInitialValues } from "./utils";
import { DOCUMENT_TYPE_OPTIONS, GENDER_OPTIONS } from "./consts";

export function PatientSheet({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: PatientSheetProps) {
  const isEdit = !!patient;
  const [calendarOpen, setCalendarOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: getInitialValues(patient),
  });

  useEffect(() => {
    if (open) {
      reset(getInitialValues(patient));
    }
  }, [open, patient, reset]);

  async function onSubmit(values: PatientFormValues) {
    const hasEmergencyContact =
      values.emergencyContactName ||
      values.emergencyContactPhone ||
      values.emergencyContactRelationship;

    const hasInsurance =
      values.insuranceProvider || values.insurancePolicyNumber;

    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      documentType: values.documentType as
        "DNI" | "PASSPORT" | "CUIL" | "OTHER",
      documentNumber: values.documentNumber,
      gender:
        (values.gender as
          "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY" | undefined) ||
        undefined,
      birthDate: values.birthDate || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      notes: values.notes || undefined,
      emergencyContact: hasEmergencyContact
        ? {
            name: values.emergencyContactName ?? "",
            phone: values.emergencyContactPhone ?? "",
            relationship: values.emergencyContactRelationship ?? "",
          }
        : undefined,
      insurance: hasInsurance
        ? {
            provider: values.insuranceProvider || undefined,
            policyNumber: values.insurancePolicyNumber || undefined,
          }
        : undefined,
    };

    const result = isEdit
      ? await updatePatient(patient!.id, payload)
      : await createPatient(payload as Parameters<typeof createPatient>[0]);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Patient updated" : "Patient created");
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto data-[side=right]:sm:max-w-336"
      >
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Patient" : "New Patient"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the patient's information."
              : "Fill in the details to create a new patient."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
          <div className="flex gap-6 px-4 py-2">
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="firstName">First name *</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="lastName">Last name *</Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="documentType">Document type *</Label>
                <Controller
                  control={control}
                  name="documentType"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="documentType"
                        aria-invalid={!!errors.documentType}
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.documentType && (
                  <p className="text-xs text-destructive">
                    {errors.documentType.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="documentNumber">Document number *</Label>
                <Input
                  id="documentNumber"
                  {...register("documentNumber")}
                  aria-invalid={!!errors.documentNumber}
                />
                {errors.documentNumber && (
                  <p className="text-xs text-destructive">
                    {errors.documentNumber.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="gender">Gender</Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label>Birth date</Label>
                <Controller
                  control={control}
                  name="birthDate"
                  render={({ field }) => {
                    const selected = field.value
                      ? new Date(field.value + "T12:00:00")
                      : undefined;
                    return (
                      <Popover
                        open={calendarOpen}
                        onOpenChange={setCalendarOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 size-4" />
                            {field.value
                              ? format(selected!, "PPP")
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selected}
                            onSelect={(date) => {
                              field.onChange(
                                date ? format(date, "yyyy-MM-dd") : "",
                              );
                              setCalendarOpen(false);
                            }}
                            captionLayout="dropdown"
                            defaultMonth={selected}
                          />
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
                {errors.birthDate && (
                  <p className="text-xs text-destructive">
                    {errors.birthDate.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <Separator orientation="vertical" />

            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  rows={3}
                  className="resize-none"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium">Emergency Contact</h3>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="emergencyContactName">Full name</Label>
                  <Input
                    id="emergencyContactName"
                    {...register("emergencyContactName")}
                    placeholder="Optional"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="emergencyContactPhone">Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    {...register("emergencyContactPhone")}
                    placeholder="Optional"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="emergencyContactRelationship">
                    Relationship
                  </Label>
                  <Input
                    id="emergencyContactRelationship"
                    {...register("emergencyContactRelationship")}
                    placeholder="e.g. Parent, Spouse"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium">Insurance</h3>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="insuranceProvider">Provider</Label>
                  <Input
                    id="insuranceProvider"
                    {...register("insuranceProvider")}
                    placeholder="Optional"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="insurancePolicyNumber">Policy number</Label>
                  <Input
                    id="insurancePolicyNumber"
                    {...register("insurancePolicyNumber")}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="mt-auto flex-row justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Create patient"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Building2,
  Landmark,
  User,
  FileText,
  Phone,
  Mail,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { createOrganization } from "@/app/actions/organizations";
import { createUserProfile } from "@/app/actions/users";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from "@/lib/consts";
import {
  onboardingFormSchema,
  STEP_FIELDS,
  type OnboardingFormValues,
} from "./types";
import { TERMS_AND_CONDITIONS_TEXT } from "./terms-content";

const TOTAL_STEPS = 4;

const STEPS = [
  { step: 1, label: "Clinic", icon: Building2 },
  { step: 2, label: "Legal", icon: Landmark },
  { step: 3, label: "Profile", icon: User },
  { step: 4, label: "Terms", icon: FileText },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center w-full mb-8">
      {STEPS.map((s, i) => {
        const done = current > s.step;
        const active = current === s.step;
        return (
          <div key={s.step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ease-out",
                  done
                    ? "bg-[#2D8A60] border-[#2D8A60] text-white"
                    : active
                      ? "bg-white border-[#2D8A60] text-[#2D8A60] scale-105"
                      : "bg-muted border-muted-foreground/20 text-muted-foreground",
                ].join(" ")}
              >
                {done ? <Check className="w-4 h-4" /> : s.step}
              </div>
              <span
                className={[
                  "text-xs font-medium transition-colors duration-300 ease-out",
                  active
                    ? "text-[#2D8A60]"
                    : done
                      ? "text-foreground"
                      : "text-muted-foreground",
                ].join(" ")}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={[
                  "flex-1 h-0.5 mx-2 mb-4 rounded transition-colors duration-500 ease-out",
                  current > s.step ? "bg-[#2D8A60]" : "bg-muted-foreground/20",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

const stepVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 24 : -24,
  }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -24 : 24,
  }),
};

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      name: "",
      email: user?.email ?? "",
      phone: "",
      legalName: "",
      taxId: "",
      currency: "ARS",
      displayName: user?.displayName || user?.email?.split("@")[0] || "",
      acceptedTerms: false,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = form;

  const watchedValues = useWatch({ control });

  async function handleNext() {
    const fields = STEP_FIELDS[step];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setDirection(1);
    setStep((s) => s + 1);
  }

  function handleBack() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  async function onSubmit(data: OnboardingFormValues) {
    if (!user) return;

    const orgResult = await createOrganization(
      {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        legalName: data.legalName || undefined,
        taxId: data.taxId || undefined,
        timezone: "UTC",
        currency: data.currency,
        plan: "FREE",
        status: "ACTIVE",
        enabledPlugins: [],
        createdBy: user.id,
        updatedBy: user.id,
      },
      user.id,
    );

    if (!orgResult.success) {
      toast.error(orgResult.error ?? "Failed to create organization.");
      return;
    }

    const profileResult = await createUserProfile(user.id, {
      organizationId: orgResult.data.id,
      roleId: "admin",
      displayName:
        data.displayName?.trim() ||
        user.displayName ||
        data.email.split("@")[0],
      email: data.email,
      status: "ACTIVE",
      createdBy: user.id,
      updatedBy: user.id,
    });

    if (!profileResult.success) {
      toast.error(profileResult.error ?? "Failed to create user profile.");
      return;
    }

    toast.success("Organization created! Welcome to ERPFlow.");
    router.push("/dashboard");
  }

  const selectedCurrency = CURRENCIES.find(
    (c) => c.value === watchedValues.currency,
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAFAFA]">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#A8E6CF] mb-3">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path
                d="M12 2L2 7v10l10 5 10-5V7L12 2z"
                stroke="#2D8A60"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M12 12v5M12 12L7 9.5M12 12l5-2.5"
                stroke="#2D8A60"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Set up your organization
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            This takes about 2 minutes.
          </p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          <StepIndicator current={step} />

          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait" custom={direction} initial={false}>
            {step === 1 && (
              <motion.div
                key={1}
                className="space-y-4"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <div>
                  <h2 className="text-base font-semibold mb-0.5">
                    Clinic basics
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Primary contact information for your organization.
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="name">Organization name *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      className="pl-9"
                      placeholder="Clínica San Martín"
                      {...register("name")}
                      aria-invalid={!!errors.name}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="email">Contact email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-9"
                      {...register("email")}
                      aria-invalid={!!errors.email}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="phone">Phone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      className="pl-9"
                      placeholder="+54 11 1234-5678"
                      {...register("phone")}
                      aria-invalid={!!errors.phone}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key={2}
                className="space-y-4"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <div>
                  <h2 className="text-base font-semibold mb-0.5">
                    Legal & billing
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Used for invoices and tax documents.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="legalName">Legal name *</Label>
                  <Input
                    id="legalName"
                    placeholder="San Martín S.A."
                    {...register("legalName")}
                    aria-invalid={!!errors.legalName}
                  />
                  {errors.legalName && (
                    <p className="text-sm text-destructive">
                      {errors.legalName.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="taxId">Tax ID / CUIT *</Label>
                  <Input
                    id="taxId"
                    placeholder="30-12345678-9"
                    {...register("taxId")}
                    aria-invalid={!!errors.taxId}
                  />
                  {errors.taxId && (
                    <p className="text-sm text-destructive">
                      {errors.taxId.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="currency">Currency *</Label>
                  <Controller
                    control={control}
                    name="currency"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.currency && (
                    <p className="text-sm text-destructive">
                      {errors.currency.message}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key={3}
                className="space-y-4"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <div>
                  <h2 className="text-base font-semibold mb-0.5">
                    Your profile
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    How your name appears inside the platform.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="displayName">Display name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="displayName"
                      className="pl-9"
                      {...register("displayName")}
                      aria-invalid={!!errors.displayName}
                    />
                  </div>
                  {errors.displayName && (
                    <p className="text-sm text-destructive">
                      {errors.displayName.message}
                    </p>
                  )}
                </div>

                <div className="mt-2 rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Summary
                  </p>
                  <SummaryRow
                    label="Organization"
                    value={watchedValues.name ?? ""}
                  />
                  <SummaryRow label="Email" value={watchedValues.email ?? ""} />
                  <SummaryRow label="Phone" value={watchedValues.phone ?? ""} />
                  <SummaryRow
                    label="Legal name"
                    value={watchedValues.legalName ?? ""}
                  />
                  <SummaryRow label="Tax ID" value={watchedValues.taxId ?? ""} />
                  <SummaryRow
                    label="Currency"
                    value={
                      selectedCurrency?.label ?? watchedValues.currency ?? ""
                    }
                  />
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key={4}
                className="space-y-4"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <div>
                  <h2 className="text-base font-semibold mb-0.5">
                    Terms and Conditions
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Please review and accept before launching your workspace.
                  </p>
                </div>

                <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {TERMS_AND_CONDITIONS_TEXT}
                </div>

                <Controller
                  control={control}
                  name="acceptedTerms"
                  render={({ field }) => (
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="acceptedTerms"
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                      <Label
                        htmlFor="acceptedTerms"
                        className="text-sm font-normal leading-snug"
                      >
                        I have read and agree to the Terms and Conditions.
                      </Label>
                    </div>
                  )}
                />
                {errors.acceptedTerms && (
                  <p className="text-sm text-destructive">
                    {errors.acceptedTerms.message}
                  </p>
                )}
              </motion.div>
            )}
            </AnimatePresence>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={step === 1}
              >
                Back
              </Button>

              {step < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-[#2D8A60] hover:bg-[#236B4A] text-white"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#2D8A60] hover:bg-[#236B4A] text-white"
                >
                  {isSubmitting ? "Creating…" : "Launch ERPFlow"}
                </Button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-muted-foreground shrink-0">
        {label}
      </span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}

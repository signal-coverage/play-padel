"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Building2,
  Landmark,
  LayoutGrid,
  User,
  Users,
  FileText,
  Phone,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { OptionCard } from "./_components/OptionCard";
import { Card } from "@/components/ui/card";
import { LogoBadge } from "@/components/LogoBadge";
import { MutedPanel } from "@/components/MutedPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, TIMEZONES } from "@/lib/consts";
import {
  onboardingFormSchema,
  STEP_FIELDS,
  PLAYER_FLOW,
  OWNER_FLOW,
  COURT_RANGE_OPTIONS,
  GENDER_OPTIONS,
  PADEL_CATEGORY_OPTIONS,
  type OnboardingFormValues,
  type OnboardingStepKey,
} from "./types";
import { TERMS_AND_CONDITIONS_TEXT } from "./terms-content";

const STEP_META: Record<
  OnboardingStepKey,
  { label: string; icon: LucideIcon }
> = {
  userType: { label: "You", icon: Users },
  clubBasics: { label: "Club", icon: Building2 },
  legalBilling: { label: "Legal", icon: Landmark },
  plan: { label: "Plan", icon: LayoutGrid },
  profile: { label: "Profile", icon: User },
  playerProfile: { label: "Profile", icon: User },
  terms: { label: "Terms", icon: FileText },
};

function StepIndicator({
  flow,
  current,
}: {
  flow: readonly OnboardingStepKey[];
  current: number;
}) {
  return (
    <div className="flex items-center w-full mb-8">
      {flow.map((key, i) => {
        const meta = STEP_META[key];
        const done = current > i;
        const active = current === i;
        return (
          <div key={key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ease-out",
                  done
                    ? "bg-primary border-primary text-primary-foreground"
                    : active
                      ? "bg-card border-primary text-primary scale-105"
                      : "bg-muted border-muted-foreground/20 text-muted-foreground",
                ].join(" ")}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={[
                  "text-xs font-medium transition-colors duration-300 ease-out",
                  active
                    ? "text-primary"
                    : done
                      ? "text-foreground"
                      : "text-muted-foreground",
                ].join(" ")}
              >
                {meta.label}
              </span>
            </div>
            {i < flow.length - 1 && (
              <div
                className={[
                  "flex-1 h-0.5 mx-2 mb-4 rounded transition-colors duration-500 ease-out",
                  current > i ? "bg-primary" : "bg-muted-foreground/20",
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
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      userType: undefined,
      name: "",
      email: user?.email ?? "",
      phone: "",
      legalName: "",
      taxId: "",
      timezone: TIMEZONES[0].value,
      currency: "ARS",
      courtRange: undefined,
      displayName: user?.displayName || user?.email?.split("@")[0] || "",
      firstName: "",
      lastName: "",
      address: "",
      gender: undefined,
      padelCategory: "unknown",
      acceptedTerms: false,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = form;

  // Clerk's useUser() resolves after this component's first render, so the
  // useForm defaultValues (captured once at mount) miss it — this backfills
  // the email once Clerk data lands, for both Google and email-OTP sign-up.
  useEffect(() => {
    if (user?.email && !getValues("email")) {
      setValue("email", user.email);
    }
  }, [user?.email, getValues, setValue]);

  const watchedValues = useWatch({ control });

  // Both flows share the "userType" step; only the choice made there decides
  // whether the club-creation steps are part of the wizard at all.
  const flow = watchedValues.userType === "owner" ? OWNER_FLOW : PLAYER_FLOW;
  const currentKey = flow[stepIndex] as OnboardingStepKey;
  const isLastStep = stepIndex === flow.length - 1;

  async function handleNext() {
    const fields = STEP_FIELDS[currentKey];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setDirection(1);
    setStepIndex((s) => s + 1);
  }

  function handleBack() {
    setDirection(-1);
    setStepIndex((s) => s - 1);
  }

  async function onSubmit(data: OnboardingFormValues) {
    if (!user) return;

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (data.userType === "owner") {
        toast.success("Club created! Welcome to Play Padel.");
      } else {
        toast.success("You're all set. Welcome to Play Padel!");
      }
      // Hard navigation, not router.push: AuthProvider only fetches /api/me
      // once per Clerk session and won't know a profile now exists, which
      // would otherwise leave DashboardGuard stuck redirecting back here
      // against OnboardingLayout redirecting to /dashboard, forever.
      window.location.assign("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  const selectedCurrency = useMemo(
    () => CURRENCIES.find((c) => c.value === watchedValues.currency),
    [watchedValues.currency],
  );
  const selectedTimezone = useMemo(
    () => TIMEZONES.find((t) => t.value === watchedValues.timezone),
    [watchedValues.timezone],
  );
  const selectedCourtRange = useMemo(
    () => COURT_RANGE_OPTIONS.find((o) => o.value === watchedValues.courtRange),
    [watchedValues.courtRange],
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <LogoBadge size="md" className="mb-3" />
          <h1 className="text-2xl font-bold text-foreground">
            Set up your Play Padel account
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            This takes about 2 minutes.
          </p>
        </div>

        <Card className="gap-0 rounded-2xl border border-border p-6 shadow-sm ring-0">
          <StepIndicator flow={flow} current={stepIndex} />

          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              {currentKey === "userType" && (
                <motion.div
                  key="userType"
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
                      Welcome to Play Padel
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Tell us how you&apos;ll be using it.
                    </p>
                  </div>

                  <Controller
                    control={control}
                    name="userType"
                    render={({ field }) => (
                      <div className="flex flex-col gap-3">
                        <OptionCard
                          icon={User}
                          title="I'm a player"
                          description="Browse clubs and reserve free courts."
                          selected={field.value === "player"}
                          onClick={() => field.onChange("player")}
                        />
                        <OptionCard
                          icon={Building2}
                          title="I'm a club owner"
                          description="Manage courts and availability for my club."
                          selected={field.value === "owner"}
                          onClick={() => field.onChange("owner")}
                        />
                      </div>
                    )}
                  />
                  {errors.userType && (
                    <p className="text-sm text-destructive">
                      {errors.userType.message}
                    </p>
                  )}
                </motion.div>
              )}

              {currentKey === "clubBasics" && (
                <motion.div
                  key="clubBasics"
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
                      Tell us about your club
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Primary contact information players will see.
                    </p>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="name">Club name *</FieldLabel>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        className="pl-9"
                        placeholder="Riverside Padel Club"
                        {...register("name")}
                        aria-invalid={!!errors.name}
                      />
                    </div>
                    <FieldError errors={[errors.name]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="email">Contact email *</FieldLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-9"
                        placeholder="contact@riversidepadel.com"
                        {...register("email")}
                        aria-invalid={!!errors.email}
                      />
                    </div>
                    <FieldError errors={[errors.email]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="phone">Phone *</FieldLabel>
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
                    <FieldError errors={[errors.phone]} />
                  </Field>
                </motion.div>
              )}

              {currentKey === "legalBilling" && (
                <motion.div
                  key="legalBilling"
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

                  <Field>
                    <FieldLabel htmlFor="legalName">Legal name *</FieldLabel>
                    <Input
                      id="legalName"
                      placeholder="Riverside Padel Club S.A."
                      {...register("legalName")}
                      aria-invalid={!!errors.legalName}
                    />
                    <FieldError errors={[errors.legalName]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="taxId">Tax ID / CUIT *</FieldLabel>
                    <Input
                      id="taxId"
                      placeholder="30-12345678-9"
                      {...register("taxId")}
                      aria-invalid={!!errors.taxId}
                    />
                    <FieldError errors={[errors.taxId]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="timezone">Timezone *</FieldLabel>
                    <Controller
                      control={control}
                      name="timezone"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="timezone">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[errors.timezone]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="currency">Currency *</FieldLabel>
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
                    <FieldError errors={[errors.currency]} />
                  </Field>
                </motion.div>
              )}

              {currentKey === "plan" && (
                <motion.div
                  key="plan"
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
                      How big is your club?
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      This helps us set you up with the right plan.
                    </p>
                  </div>

                  <Controller
                    control={control}
                    name="courtRange"
                    render={({ field }) => (
                      <div className="flex flex-col gap-3">
                        {COURT_RANGE_OPTIONS.map((option) => (
                          <OptionCard
                            key={option.value}
                            icon={LayoutGrid}
                            title={option.label}
                            description={option.note}
                            selected={field.value === option.value}
                            onClick={() => field.onChange(option.value)}
                          />
                        ))}
                      </div>
                    )}
                  />
                  {errors.courtRange && (
                    <p className="text-sm text-destructive">
                      {errors.courtRange.message}
                    </p>
                  )}
                </motion.div>
              )}

              {currentKey === "profile" && (
                <motion.div
                  key="profile"
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
                      How your name appears inside Play Padel.
                    </p>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="displayName">
                      Display name *
                    </FieldLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="displayName"
                        className="pl-9"
                        {...register("displayName")}
                        aria-invalid={!!errors.displayName}
                      />
                    </div>
                    <FieldError errors={[errors.displayName]} />
                  </Field>

                  <MutedPanel bordered size="md" className="mt-2 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Summary
                    </p>
                    <SummaryRow label="Club" value={watchedValues.name ?? ""} />
                    <SummaryRow
                      label="Email"
                      value={watchedValues.email ?? ""}
                    />
                    <SummaryRow
                      label="Phone"
                      value={watchedValues.phone ?? ""}
                    />
                    <SummaryRow
                      label="Legal name"
                      value={watchedValues.legalName ?? ""}
                    />
                    <SummaryRow
                      label="Tax ID"
                      value={watchedValues.taxId ?? ""}
                    />
                    <SummaryRow
                      label="Timezone"
                      value={
                        selectedTimezone?.label ?? watchedValues.timezone ?? ""
                      }
                    />
                    <SummaryRow
                      label="Currency"
                      value={
                        selectedCurrency?.label ?? watchedValues.currency ?? ""
                      }
                    />
                    <SummaryRow
                      label="Courts"
                      value={
                        selectedCourtRange?.label ??
                        watchedValues.courtRange ??
                        ""
                      }
                    />
                  </MutedPanel>
                </motion.div>
              )}

              {currentKey === "playerProfile" && (
                <motion.div
                  key="playerProfile"
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
                      Tell us a bit about yourself.
                    </p>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="firstName">First name *</FieldLabel>
                    <Input
                      id="firstName"
                      {...register("firstName")}
                      aria-invalid={!!errors.firstName}
                    />
                    <FieldError errors={[errors.firstName]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="lastName">Last name *</FieldLabel>
                    <Input
                      id="lastName"
                      {...register("lastName")}
                      aria-invalid={!!errors.lastName}
                    />
                    <FieldError errors={[errors.lastName]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="email">Email *</FieldLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-9"
                        placeholder="you@example.com"
                        {...register("email")}
                        aria-invalid={!!errors.email}
                      />
                    </div>
                    <FieldError errors={[errors.email]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="phone">Phone *</FieldLabel>
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
                    <FieldError errors={[errors.phone]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="address">Address</FieldLabel>
                    <Input
                      id="address"
                      placeholder="Optional"
                      {...register("address")}
                      aria-invalid={!!errors.address}
                    />
                    <FieldError errors={[errors.address]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="gender">Gender *</FieldLabel>
                    <Controller
                      control={control}
                      name="gender"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? undefined}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id="gender"
                            aria-invalid={!!errors.gender}
                          >
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDER_OPTIONS.map((g) => (
                              <SelectItem key={g.value} value={g.value}>
                                {g.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[errors.gender]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="padelCategory">
                      Padel category
                    </FieldLabel>
                    <FieldDescription>
                      Your skill-level ranking — Category 1 is the highest
                      level, Category 8 is a beginner.
                    </FieldDescription>
                    <Controller
                      control={control}
                      name="padelCategory"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? "unknown"}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="padelCategory">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PADEL_CATEGORY_OPTIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[errors.padelCategory]} />
                  </Field>
                </motion.div>
              )}

              {currentKey === "terms" && (
                <motion.div
                  key="terms"
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
                      Please review and accept before continuing.
                    </p>
                  </div>

                  <MutedPanel
                    bordered
                    size="md"
                    className="max-h-56 overflow-y-auto text-xs text-muted-foreground leading-relaxed whitespace-pre-line"
                  >
                    {TERMS_AND_CONDITIONS_TEXT}
                  </MutedPanel>

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
                disabled={stepIndex === 0}
              >
                Back
              </Button>

              {!isLastStep ? (
                <Button type="button" onClick={handleNext}>
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || !watchedValues.acceptedTerms}
                >
                  {isSubmitting
                    ? "Setting up…"
                    : watchedValues.userType === "owner"
                      ? "Launch my club"
                      : "Start playing"}
                </Button>
              )}
            </div>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {stepIndex + 1} of {flow.length}
        </p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}

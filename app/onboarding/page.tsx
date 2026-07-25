"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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

function optionCardClass(selected: boolean) {
  return [
    "flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors duration-200",
    selected
      ? "border-primary bg-primary/5"
      : "border-border hover:border-muted-foreground/30",
  ].join(" ");
}

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
    () =>
      COURT_RANGE_OPTIONS.find((o) => o.value === watchedValues.courtRange),
    [watchedValues.courtRange],
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-black/10 mb-3 p-2">
            <Image src="/logo.svg" alt="Play Padel" width={24} height={24} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Set up your Play Padel account
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            This takes about 2 minutes.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
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
                        <button
                          type="button"
                          onClick={() => field.onChange("player")}
                          className={optionCardClass(field.value === "player")}
                        >
                          <User className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
                          <div>
                            <p className="text-sm font-semibold">
                              I&apos;m a player
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Browse clubs and reserve free courts.
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange("owner")}
                          className={optionCardClass(field.value === "owner")}
                        >
                          <Building2 className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
                          <div>
                            <p className="text-sm font-semibold">
                              I&apos;m a club owner
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Manage courts and availability for my club.
                            </p>
                          </div>
                        </button>
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
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="name">Club name *</Label>
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
                        placeholder="contact@riversidepadel.com"
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

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="legalName">Legal name *</Label>
                    <Input
                      id="legalName"
                      placeholder="Riverside Padel Club S.A."
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
                    <Label htmlFor="timezone">Timezone *</Label>
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
                    {errors.timezone && (
                      <p className="text-sm text-destructive">
                        {errors.timezone.message}
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
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            className={optionCardClass(
                              field.value === option.value,
                            )}
                          >
                            <LayoutGrid className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
                            <div>
                              <p className="text-sm font-semibold">
                                {option.label}
                              </p>
                              {option.note && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {option.note}
                                </p>
                              )}
                            </div>
                          </button>
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
                  </div>
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

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="firstName">First name *</Label>
                    <Input
                      id="firstName"
                      {...register("firstName")}
                      aria-invalid={!!errors.firstName}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">
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
                      <p className="text-sm text-destructive">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="email">Email *</Label>
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

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Optional"
                      {...register("address")}
                      aria-invalid={!!errors.address}
                    />
                    {errors.address && (
                      <p className="text-sm text-destructive">
                        {errors.address.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="gender">Gender *</Label>
                    <Controller
                      control={control}
                      name="gender"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? undefined}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="gender" aria-invalid={!!errors.gender}>
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
                    {errors.gender && (
                      <p className="text-sm text-destructive">
                        {errors.gender.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label htmlFor="padelCategory">Padel category</Label>
                    <p className="text-xs text-muted-foreground">
                      Your skill-level ranking — Category 1 is the highest
                      level, Category 8 is a beginner.
                    </p>
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
                    {errors.padelCategory && (
                      <p className="text-sm text-destructive">
                        {errors.padelCategory.message}
                      </p>
                    )}
                  </div>
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
                disabled={stepIndex === 0}
              >
                Back
              </Button>

              {!isLastStep ? (
                <Button type="button" onClick={handleNext}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Setting up…"
                    : watchedValues.userType === "owner"
                      ? "Launch my club"
                      : "Start playing"}
                </Button>
              )}
            </div>
          </form>
        </div>

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

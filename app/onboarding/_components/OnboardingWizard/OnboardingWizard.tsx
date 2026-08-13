"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { LogoBadge } from "@/components/LogoBadge";
import { Button } from "@/components/ui/button";
import { CURRENCIES, TIMEZONES } from "@/lib/consts";
import {
  onboardingFormSchema,
  STEP_FIELDS,
  PLAYER_FLOW,
  OWNER_FLOW,
  COURT_RANGE_OPTIONS,
  type OnboardingFormValues,
  type OnboardingStepKey,
} from "@/app/onboarding/types";
import { StepIndicator } from "./components/StepIndicator";
import { ClubBasicsStep } from "./components/steps/ClubBasicsStep";
import { LegalBillingStep } from "./components/steps/LegalBillingStep";
import { PlanStep } from "./components/steps/PlanStep";
import { PlayerProfileStep } from "./components/steps/PlayerProfileStep";
import { ProfileStep } from "./components/steps/ProfileStep";
import { TermsStep } from "./components/steps/TermsStep";
import { UserTypeStep } from "./components/steps/UserTypeStep";
import { stepVariants } from "./styles";

export function OnboardingWizard() {
  const { user } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const shouldReduce = useReducedMotion();
  // Tracks whether the user has ever left the very first step (via Continue
  // or Back). Stays false through the initial render so that step's mount
  // effect knows not to steal focus off the visible <h1>; flips to true the
  // moment handleNext/handleBack fire, so every step that mounts afterwards
  // — including the first step if the user navigates back to it — asks for
  // focus on its own heading.
  const [hasNavigatedOnce, setHasNavigatedOnce] = useState(false);
  const stepTransition = shouldReduce
    ? { duration: 0 }
    : { duration: 0.25, ease: "easeInOut" as const };

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
  // False only for the very first step shown on initial mount. Each step
  // component owns its own mount effect that focuses its own <h2> when this
  // is true — that sidesteps the AnimatePresence mode="wait" race, since the
  // effect fires exactly when that step's own DOM node exists.
  const shouldFocusHeading = hasNavigatedOnce;

  function onInvalidSubmit(formErrors: typeof errors) {
    if (formErrors.acceptedTerms) {
      document.getElementById("acceptedTerms")?.focus();
    }
  }

  async function handleNext() {
    const fields = STEP_FIELDS[currentKey];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setDirection(1);
    setHasNavigatedOnce(true);
    setStepIndex((s) => s + 1);
  }

  function handleBack() {
    setDirection(-1);
    setHasNavigatedOnce(true);
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
        toast.success("Club created. Welcome to Play Padel.");
      } else {
        toast.success("You're all set. Welcome to Play Padel.");
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
    <div className="min-h-dvh flex items-center justify-center p-4 bg-muted">
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

          <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}>
            <div>
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                {currentKey === "userType" && (
                  <motion.div
                    key="userType"
                    className="space-y-4"
                    custom={direction}
                    variants={stepVariants}
                    initial={shouldReduce ? false : "enter"}
                    animate="center"
                    exit={shouldReduce ? "center" : "exit"}
                    transition={stepTransition}
                  >
                    <UserTypeStep
                      control={control}
                      errors={errors}
                      shouldFocusHeading={shouldFocusHeading}
                    />
                  </motion.div>
                )}

                {currentKey === "clubBasics" && (
                  <motion.div
                    key="clubBasics"
                    className="space-y-4"
                    custom={direction}
                    variants={stepVariants}
                    initial={shouldReduce ? false : "enter"}
                    animate="center"
                    exit={shouldReduce ? "center" : "exit"}
                    transition={stepTransition}
                  >
                    <ClubBasicsStep
                      register={register}
                      errors={errors}
                      shouldFocusHeading={shouldFocusHeading}
                    />
                  </motion.div>
                )}

                {currentKey === "legalBilling" && (
                  <motion.div
                    key="legalBilling"
                    className="space-y-4"
                    custom={direction}
                    variants={stepVariants}
                    initial={shouldReduce ? false : "enter"}
                    animate="center"
                    exit={shouldReduce ? "center" : "exit"}
                    transition={stepTransition}
                  >
                    <LegalBillingStep
                      register={register}
                      control={control}
                      errors={errors}
                      shouldFocusHeading={shouldFocusHeading}
                    />
                  </motion.div>
                )}

                {currentKey === "plan" && (
                  <motion.div
                    key="plan"
                    className="space-y-4"
                    custom={direction}
                    variants={stepVariants}
                    initial={shouldReduce ? false : "enter"}
                    animate="center"
                    exit={shouldReduce ? "center" : "exit"}
                    transition={stepTransition}
                  >
                    <PlanStep
                      control={control}
                      errors={errors}
                      shouldFocusHeading={shouldFocusHeading}
                    />
                  </motion.div>
                )}

                {currentKey === "profile" && (
                  <motion.div
                    key="profile"
                    className="space-y-4"
                    custom={direction}
                    variants={stepVariants}
                    initial={shouldReduce ? false : "enter"}
                    animate="center"
                    exit={shouldReduce ? "center" : "exit"}
                    transition={stepTransition}
                  >
                    <ProfileStep
                      register={register}
                      errors={errors}
                      clubName={watchedValues.name ?? ""}
                      email={watchedValues.email ?? ""}
                      phone={watchedValues.phone ?? ""}
                      legalName={watchedValues.legalName ?? ""}
                      taxId={watchedValues.taxId ?? ""}
                      timezoneLabel={
                        selectedTimezone?.label ?? watchedValues.timezone ?? ""
                      }
                      currencyLabel={
                        selectedCurrency?.label ?? watchedValues.currency ?? ""
                      }
                      courtRangeLabel={
                        selectedCourtRange?.label ??
                        watchedValues.courtRange ??
                        ""
                      }
                      shouldFocusHeading={shouldFocusHeading}
                    />
                  </motion.div>
                )}

                {currentKey === "playerProfile" && (
                  <motion.div
                    key="playerProfile"
                    className="space-y-4"
                    custom={direction}
                    variants={stepVariants}
                    initial={shouldReduce ? false : "enter"}
                    animate="center"
                    exit={shouldReduce ? "center" : "exit"}
                    transition={stepTransition}
                  >
                    <PlayerProfileStep
                      register={register}
                      control={control}
                      errors={errors}
                      shouldFocusHeading={shouldFocusHeading}
                    />
                  </motion.div>
                )}

                {currentKey === "terms" && (
                  <motion.div
                    key="terms"
                    className="space-y-4"
                    custom={direction}
                    variants={stepVariants}
                    initial={shouldReduce ? false : "enter"}
                    animate="center"
                    exit={shouldReduce ? "center" : "exit"}
                    transition={stepTransition}
                  >
                    <TermsStep
                      control={control}
                      errors={errors}
                      shouldFocusHeading={shouldFocusHeading}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
        </Card>

        <p
          role="status"
          aria-live="polite"
          className="text-center text-xs text-muted-foreground mt-4"
        >
          Step {stepIndex + 1} of {flow.length}
        </p>
      </div>
    </div>
  );
}

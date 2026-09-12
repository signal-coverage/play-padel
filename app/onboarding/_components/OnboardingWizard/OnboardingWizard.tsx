"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { track } from "@vercel/analytics";
import { track as trackAmplitude } from "@amplitude/unified";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { LogoBadge } from "@/components/LogoBadge";
import { Button } from "@/components/ui/button";
import { TIMEZONES } from "@/lib/consts";
import {
  onboardingFormSchema,
  STEP_FIELDS,
  PLAYER_FLOW,
  OWNER_FLOW,
  type OnboardingFormValues,
  type OnboardingStepKey,
} from "@/app/onboarding/types";
import { StepIndicator } from "./components/StepIndicator";
import { ClubBasicsStep } from "./components/steps/ClubBasicsStep";
import { LegalBillingStep } from "./components/steps/LegalBillingStep";
import { PadelProfileStep } from "./components/steps/PadelProfileStep";
import { PlayerProfileStep } from "./components/steps/PlayerProfileStep";
import { ProfileStep } from "./components/steps/ProfileStep";
import { TermsStep } from "./components/steps/TermsStep";
import { UserTypeStep } from "./components/steps/UserTypeStep";
import { stepVariants } from "./styles";

export function OnboardingWizard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
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
    // Reactive validation is required for the Continue/Submit buttons below
    // to disable themselves live as required fields go from empty to filled
    // (or vice versa), rather than only surfacing errors after a click.
    mode: "onChange",
    defaultValues: {
      userType: undefined,
      name: user?.displayName ? `${user.displayName} Club` : "",
      email: user?.email ?? "",
      phone: "",
      whatsappNumber: "",
      whatsappCountry: "",
      legalName: "",
      taxId: "",
      timezone: TIMEZONES[0].value,
      currency: "ARS",
      displayName: "",
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      address: "",
      country: "",
      province: "",
      city: "",
      zipCode: "",
      gender: undefined,
      padelCategory: "unknown",
      preferredSide: undefined,
      dominantHand: undefined,
      confirmedAge: false,
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
  // the email and name fields once Clerk data lands, for both Google and
  // email-OTP sign-up. Name fields come from Clerk's normalized
  // firstName/lastName, which for Google OAuth are populated from
  // given_name/family_name. The club "name" field is also seeded from the
  // account's display name — a business Google account's display name is
  // often the business name itself, so it's a reasonable editable starting
  // guess for owners, same as the player name fields.
  useEffect(() => {
    if (user?.email && !getValues("email")) {
      setValue("email", user.email);
    }
    if (user?.firstName && !getValues("firstName")) {
      setValue("firstName", user.firstName);
    }
    if (user?.lastName && !getValues("lastName")) {
      setValue("lastName", user.lastName);
    }
    if (user?.displayName && !getValues("name")) {
      setValue("name", `${user.displayName} Club`);
    }
  }, [
    user?.email,
    user?.firstName,
    user?.lastName,
    user?.displayName,
    getValues,
    setValue,
  ]);

  const watchedValues = useWatch({ control });

  // Legal name and display name both default to the club name as the owner
  // types it in an earlier step (most small clubs register under the same
  // name they trade as, and a solo owner's "display name" in the app is
  // often just the club itself). Each stops tracking the moment the owner
  // types their own value into that field — the empty-check means it only
  // ever fills in a value the user hasn't already overridden, it never
  // clobbers an edit.
  useEffect(() => {
    if (watchedValues.name && !getValues("legalName")) {
      setValue("legalName", watchedValues.name);
    }
    if (watchedValues.name && !getValues("displayName")) {
      setValue("displayName", watchedValues.name);
    }
  }, [watchedValues.name, getValues, setValue]);

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

  // Continue/Submit are disabled until every field belonging to THIS step is
  // currently valid — scoped to currentKey's own fields (not the whole
  // form), so a later step's required fields don't block navigation through
  // earlier ones.
  //
  // This deliberately does NOT use RHF's own `errors`/`trigger()` — running
  // validation through RHF is what makes it visible (it populates the same
  // `errors` object FieldError reads from), which would flash "required"
  // messages the instant a blank step loads, before the user has touched
  // anything. A fresh, independent zod parse computes the same validity for
  // the button without ever touching what's displayed — error text still
  // only appears the original way, through interaction or a failed Continue.
  const stepValidation = onboardingFormSchema.safeParse(watchedValues);
  const currentStepInvalid =
    !stepValidation.success &&
    stepValidation.error.issues.some((issue) =>
      STEP_FIELDS[currentKey].includes(
        issue.path[0] as keyof OnboardingFormValues,
      ),
    );

  function onInvalidSubmit(formErrors: typeof errors) {
    if (formErrors.confirmedAge) {
      document.getElementById("confirmedAge")?.focus();
    } else if (formErrors.acceptedTerms) {
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

  // The very first step has nowhere to go "back" to — Back sat disabled
  // there with no other way out, leaving Cancel as the only escape from an
  // account that's mid-signup. Signs out (not just a plain navigate): "/"
  // itself redirects a still-signed-in, not-yet-onboarded user straight back
  // here (see app/page.tsx's own hasCompletedOnboarding redirect), so
  // landing on the real marketing page requires actually ending the session
  // first — same signOut()-then-push("/") sequence UserMenu.tsx's own Sign
  // out item already uses.
  async function handleCancel() {
    await signOut();
    router.push("/");
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
      track("signup_completed", { role: data.userType });
      trackAmplitude("signup_completed", { role: data.userType });
      // Hard navigation, not router.push: AuthProvider only fetches /api/me
      // once per Clerk session and won't know a profile now exists, which
      // would otherwise leave DashboardGuard stuck redirecting back here
      // against OnboardingLayout redirecting to /dashboard, forever.
      window.location.assign("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-muted">
      <div className="w-full max-w-xl transition-[max-width] duration-300 ease-out">
        <div className="mb-6 text-center">
          <LogoBadge size="md" className="mb-3" />
          <h1 className="text-2xl font-bold text-foreground">
            Set up your Play Padel account
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            This takes about 2 minutes.
          </p>
        </div>

        <Card className="gap-0 rounded-sm border border-border p-6 shadow-sm ring-0">
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
                      control={control}
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
                      address={watchedValues.address ?? ""}
                      country={watchedValues.country ?? ""}
                      province={watchedValues.province ?? ""}
                      city={watchedValues.city ?? ""}
                      zipCode={watchedValues.zipCode ?? ""}
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

                {currentKey === "padelProfile" && (
                  <motion.div
                    key="padelProfile"
                    className="space-y-4"
                    custom={direction}
                    variants={stepVariants}
                    initial={shouldReduce ? false : "enter"}
                    animate="center"
                    exit={shouldReduce ? "center" : "exit"}
                    transition={stepTransition}
                  >
                    <PadelProfileStep
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
                onClick={stepIndex === 0 ? handleCancel : handleBack}
              >
                {stepIndex === 0 ? "Cancel" : "Back"}
              </Button>

              {!isLastStep ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={currentStepInvalid}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || currentStepInvalid}
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

import { useEffect, useRef } from "react";
import { Building2, User } from "lucide-react";
import { Controller } from "react-hook-form";
import { OptionCard } from "@/app/onboarding/_components/OptionCard";
import { FieldError } from "@/components/ui/field";
import type { UserTypeStepProps } from "./types";

export function UserTypeStep({
  control,
  errors,
  shouldFocusHeading,
}: UserTypeStepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (shouldFocusHeading) {
      headingRef.current?.focus();
    }
  }, [shouldFocusHeading]);

  return (
    <>
      <div>
        <h2
          ref={headingRef}
          className="text-base font-semibold mb-0.5"
          tabIndex={-1}
        >
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
      <FieldError errors={[errors.userType]} />
    </>
  );
}

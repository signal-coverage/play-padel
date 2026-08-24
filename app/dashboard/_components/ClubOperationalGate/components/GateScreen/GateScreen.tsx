"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/utils";
import type { GateScreenProps } from "./types";

// Shared page-content shell for both club-operational-gate causes
// (MP_NOT_CONNECTED and CLUB_INACTIVE). ClubOperationalGate renders this
// directly in the dashboard's page-content slot instead of the underlying
// page — there's nothing left underneath for a floating Dialog/overlay to
// sit on top of, so this is plain page content: a heading, a description,
// optional cause-specific content, and a submit action. No portal, no
// backdrop, no dismiss affordance — this isn't a modal.
export function GateScreen({
  title,
  description,
  children,
  contentClassName,
  submitLabel,
  submitDisabled,
  onSubmit,
}: GateScreenProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div
        className={cn(
          "mx-auto flex w-full max-w-lg flex-col gap-4",
          contentClassName,
        )}
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        </div>

        <Separator />

        {children ? (
          <>
            {children}
            <Separator />
          </>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => onSubmit?.()}
            disabled={submitDisabled}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

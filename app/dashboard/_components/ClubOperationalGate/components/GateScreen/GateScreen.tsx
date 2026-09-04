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
    // overflow-y-auto is load-bearing: this screen's ancestor `<main>`
    // (DashboardShell.tsx) is `md:overflow-hidden` on desktop — other
    // dashboard pages manage their own internal scroll region rather than
    // relying on it, and this one previously had none, so content taller
    // than the viewport was silently clipped with no way to reach it.
    <div className="flex h-full w-full flex-col items-center justify-center overflow-y-auto">
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

        {submitLabel ? (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => onSubmit?.()}
              disabled={submitDisabled}
            >
              {submitLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

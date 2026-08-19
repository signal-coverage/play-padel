"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GuardedActionButton } from "@/components/GuardedActionButton";
import type { ConfirmDialogProps } from "./types";

// Deliberately uses GuardedActionButton instead of AlertDialogAction for the
// confirm button: AlertDialogAction wraps Radix's Dialog.Close, whose click
// handler unconditionally closes the dialog in the same synchronous click —
// racing an async onConfirm mutation. GuardedActionButton + the caller's own
// onOpenChange guard (see useGuardedDialogClose) keep the dialog open until
// the mutation actually settles.
//
// No onPointerDownOutside handling is added here: Radix's AlertDialogContent
// already calls `event.preventDefault()` unconditionally on both
// onPointerDownOutside and onInteractOutside (see
// @radix-ui/react-alert-dialog's AlertDialogContent), so outside clicks never
// dismiss an AlertDialog. That built-in behavior can't even be overridden via
// props — Radix's own handler is the last one spread onto the underlying
// Dialog.Content, so a caller-supplied onPointerDownOutside would be
// silently discarded. This is the correct, already-safe default; forwarding
// the prop here would add dead complexity.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = "Cancel",
  confirmLabel,
  pendingLabel,
  isPending,
  onConfirm,
  variant = "destructive",
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>
          <GuardedActionButton
            variant={variant}
            isPending={isPending}
            onClick={onConfirm}
          >
            {isPending ? pendingLabel : confirmLabel}
          </GuardedActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

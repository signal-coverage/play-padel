import { useCallback } from "react";

/**
 * Returns a Dialog/AlertDialog `onOpenChange` handler that refuses to close
 * while a mutation is pending, and otherwise runs `onClose` on dismissal.
 *
 * Radix only calls `onOpenChange` with `open=false` for user-initiated
 * dismissal (escape key, outside click, or an internal Close trigger such as
 * `AlertDialogAction`/`AlertDialogCancel`) — the `open=true` case never
 * fires for a controlled dialog, so this handler only needs to guard the
 * close path.
 */
export function useGuardedDialogClose(
  isPending: boolean,
  onClose: () => void,
): (open: boolean) => void {
  return useCallback(
    (open: boolean) => {
      if (!open && isPending) return;
      if (!open) onClose();
    },
    [isPending, onClose],
  );
}

import type { StatusBoxProps } from "./types";

/**
 * Bordered box with centered muted text, used for a data view's loading,
 * empty, and permission-denied states. Visually distinct from the dashed
 * `Empty` primitives in `components/ui/empty.tsx` (icon + title +
 * description) — this is the simpler solid-border, no-icon convention used
 * by table loading/empty states and the owner-only guard message.
 */
export function StatusBox({ children }: StatusBoxProps) {
  return (
    <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

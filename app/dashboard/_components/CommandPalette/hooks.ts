import { useEffect } from "react";

/**
 * Toggles the command palette on Cmd+K (Mac) / Ctrl+K (Windows/Linux),
 * listening globally so it works no matter what's focused in the dashboard.
 * Escape-to-close is already handled by the underlying CommandDialog.
 */
export function useCommandPaletteShortcut(
  setOpen: (updater: (open: boolean) => boolean) => void,
) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;

      event.preventDefault();
      setOpen((open) => !open);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);
}

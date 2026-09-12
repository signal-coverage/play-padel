"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SystemJobErrorDialogProps } from "./types";

/**
 * The full, untruncated text of a SystemJobLog entry's error — the Recent
 * Activity table's own "Error" column truncates every row to one line (see
 * AdminStatusRecentActivity.tsx), which made a long stack trace impossible
 * to actually read. A fixed dialog height (not content-driven) keeps a
 * one-line error and a multi-KB stack trace opening to the same size —
 * only the error text itself scrolls (the block below), header/footer stay
 * put.
 */
export function SystemJobErrorDialog({
  open,
  onOpenChange,
  jobLabel,
  when,
  errorMessage,
}: SystemJobErrorDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(errorMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the
      // button just staying on "Copy" is feedback enough; no need for a
      // toast on top of a modal that's already open.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-112 max-w-[calc(100%-2rem)] flex-col sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>Error details</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {jobLabel} · {when}
          </p>
        </DialogHeader>

        <pre
          data-testid="system-job-error-text"
          className="min-h-0 flex-1 overflow-y-auto rounded-sm border bg-muted/30 p-3 text-xs whitespace-pre-wrap text-foreground"
        >
          {errorMessage}
        </pre>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

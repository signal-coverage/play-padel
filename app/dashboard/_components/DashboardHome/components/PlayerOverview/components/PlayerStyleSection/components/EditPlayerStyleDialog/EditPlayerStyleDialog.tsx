"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  DOMINANT_HAND_OPTIONS,
  PREFERRED_SIDE_OPTIONS,
} from "@/core/users/consts";
import { useUpdatePlayerStyle } from "../../../../hooks";
import type { DominantHand, PreferredSide } from "@/core/users/types";

export function EditPlayerStyleDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [preferredSide, setPreferredSide] = useState<PreferredSide | undefined>(
    user?.preferredSide ?? undefined,
  );
  const [dominantHand, setDominantHand] = useState<DominantHand | undefined>(
    user?.dominantHand ?? undefined,
  );
  const { mutate, isPending } = useUpdatePlayerStyle();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      // Reset the form to the current real values every time it opens.
      setPreferredSide(user?.preferredSide ?? undefined);
      setDominantHand(user?.dominantHand ?? undefined);
    }
    setOpen(nextOpen);
  }

  function handleSave() {
    mutate(
      { preferredSide, dominantHand },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          className="h-5 rounded px-1.5 text-[10px] font-normal text-muted-foreground"
          aria-label="Edit play style"
        >
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit play style</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="preferred-side"
              className="text-xs text-muted-foreground"
            >
              Preferred side
            </Label>
            <Select
              value={preferredSide}
              onValueChange={(v) => setPreferredSide(v as PreferredSide)}
            >
              <SelectTrigger id="preferred-side">
                <SelectValue placeholder="Not set yet" />
              </SelectTrigger>
              <SelectContent>
                {PREFERRED_SIDE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="dominant-hand"
              className="text-xs text-muted-foreground"
            >
              Dominant hand
            </Label>
            <Select
              value={dominantHand}
              onValueChange={(v) => setDominantHand(v as DominantHand)}
            >
              <SelectTrigger id="dominant-hand">
                <SelectValue placeholder="Not set yet" />
              </SelectTrigger>
              <SelectContent>
                {DOMINANT_HAND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

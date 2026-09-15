"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
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
  buildDominantHandOptions,
  buildPreferredSideOptions,
} from "@/core/users/consts";
import { useUpdatePlayerStyle } from "../../../../hooks";
import type { DominantHand, PreferredSide } from "@/core/users/types";

export function EditPlayerStyleDialog() {
  const t = useTranslations("EditPlayerStyleDialog");
  const tOptions = useTranslations("UserOptionLabels");
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [preferredSide, setPreferredSide] = useState<PreferredSide | undefined>(
    user?.preferredSide ?? undefined,
  );
  const [dominantHand, setDominantHand] = useState<DominantHand | undefined>(
    user?.dominantHand ?? undefined,
  );
  const { mutate, isPending } = useUpdatePlayerStyle();
  const preferredSideOptions = buildPreferredSideOptions(tOptions);
  const dominantHandOptions = buildDominantHandOptions(tOptions);

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
          variant="default"
          size="icon-xs"
          className="rounded-full shadow-card"
          aria-label={t("editPlayStyle")}
        >
          <Pencil className="size-3" />
        </Button>
      </DialogTrigger>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("editPlayStyle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="preferred-side"
              className="text-xs text-muted-foreground"
            >
              {t("preferredSide")}
            </Label>
            <Select
              value={preferredSide}
              onValueChange={(v) => setPreferredSide(v as PreferredSide)}
            >
              <SelectTrigger id="preferred-side">
                <SelectValue placeholder={t("notSetYet")} />
              </SelectTrigger>
              <SelectContent>
                {preferredSideOptions.map((option) => (
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
              {t("dominantHand")}
            </Label>
            <Select
              value={dominantHand}
              onValueChange={(v) => setDominantHand(v as DominantHand)}
            >
              <SelectTrigger id="dominant-hand">
                <SelectValue placeholder={t("notSetYet")} />
              </SelectTrigger>
              <SelectContent>
                {dominantHandOptions.map((option) => (
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
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

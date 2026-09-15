import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { slotDurationOptionsWith } from "./utils";
import type { SlotDurationFieldProps } from "./types";

export function SlotDurationField({
  id,
  value,
  onChange,
  ariaInvalid,
}: SlotDurationFieldProps) {
  const t = useTranslations("SlotDurationField");
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => onChange(Number(next))}
    >
      <SelectTrigger id={id} className="w-full" aria-invalid={ariaInvalid}>
        <SelectValue placeholder={t("selectDuration")} />
      </SelectTrigger>
      <SelectContent>
        {slotDurationOptionsWith(value).map((minutes) => (
          <SelectItem key={minutes} value={String(minutes)}>
            {t("minutes", { minutes })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

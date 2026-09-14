import { useTranslations } from "next-intl";
import { COURT_WALL_TYPE_OPTIONS } from "./consts";
import { getWallTypeOptionClassName } from "./styles";
import type { WallTypeFieldProps } from "./types";

export function WallTypeField({ name, value, onChange }: WallTypeFieldProps) {
  const t = useTranslations("WallTypeField");
  return (
    <div className="flex flex-wrap gap-2">
      {COURT_WALL_TYPE_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={getWallTypeOptionClassName(value === option.value)}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {t(option.labelKey)}
        </label>
      ))}
    </div>
  );
}

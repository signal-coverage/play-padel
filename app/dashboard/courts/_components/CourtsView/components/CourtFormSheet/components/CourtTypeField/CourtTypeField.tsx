import { useTranslations } from "next-intl";
import { COURT_TYPE_OPTIONS } from "./consts";
import { getCourtTypeOptionClassName } from "./styles";
import type { CourtTypeFieldProps } from "./types";

export function CourtTypeField({
  name,
  indoor,
  onChange,
}: CourtTypeFieldProps) {
  const t = useTranslations("CourtLabels");
  return (
    <div className="flex gap-2">
      {COURT_TYPE_OPTIONS.map(({ value, labelKey, Icon }) => (
        <label
          key={labelKey}
          className={getCourtTypeOptionClassName(indoor === value)}
        >
          <input
            type="radio"
            name={name}
            checked={indoor === value}
            onChange={() => onChange(value)}
            className="sr-only"
          />
          <Icon className="size-5" aria-hidden="true" />
          {t(labelKey)}
        </label>
      ))}
    </div>
  );
}

import { COURT_TYPE_OPTIONS } from "./consts";
import { getCourtTypeOptionClassName } from "./styles";
import type { CourtTypeFieldProps } from "./types";

export function CourtTypeField({
  name,
  indoor,
  onChange,
}: CourtTypeFieldProps) {
  return (
    <div className="flex gap-2">
      {COURT_TYPE_OPTIONS.map(({ value, label, Icon }) => (
        <label
          key={label}
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
          {label}
        </label>
      ))}
    </div>
  );
}

import { COURT_NET_TYPE_OPTIONS } from "./consts";
import { getNetTypeOptionClassName } from "./styles";
import type { NetTypeFieldProps } from "./types";

export function NetTypeField({ name, value, onChange }: NetTypeFieldProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COURT_NET_TYPE_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={getNetTypeOptionClassName(value === option.value)}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

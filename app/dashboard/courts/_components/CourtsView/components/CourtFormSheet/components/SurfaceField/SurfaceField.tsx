import { COURT_SURFACE_OPTIONS } from "./consts";
import { getSurfaceOptionClassName } from "./styles";
import type { SurfaceFieldProps } from "./types";

export function SurfaceField({ name, value, onChange }: SurfaceFieldProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COURT_SURFACE_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={getSurfaceOptionClassName(value === option.value)}
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

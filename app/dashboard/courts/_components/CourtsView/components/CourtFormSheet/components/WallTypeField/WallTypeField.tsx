import { COURT_WALL_TYPE_OPTIONS } from "./consts";
import { getWallTypeOptionClassName } from "./styles";
import type { WallTypeFieldProps } from "./types";

export function WallTypeField({ name, value, onChange }: WallTypeFieldProps) {
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
          {option.label}
        </label>
      ))}
    </div>
  );
}

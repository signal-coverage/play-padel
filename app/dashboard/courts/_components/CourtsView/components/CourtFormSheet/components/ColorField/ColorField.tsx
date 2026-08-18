import { COURT_COLOR_OPTIONS } from "./consts";
import { CUSTOM_SWATCH_BACKGROUND, getColorSwatchClassName } from "./styles";
import { isPresetColor } from "./utils";
import type { ColorFieldProps } from "./types";

export function ColorField({ name, value, onChange }: ColorFieldProps) {
  const isCustom = !isPresetColor(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {COURT_COLOR_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={getColorSwatchClassName(
            !isCustom && value === option.value,
          )}
          style={{ background: option.value }}
          title={option.label}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={!isCustom && value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          <span className="sr-only">{option.label}</span>
        </label>
      ))}

      <label
        className={getColorSwatchClassName(isCustom)}
        style={{ background: isCustom ? value : CUSTOM_SWATCH_BACKGROUND }}
        title="Custom color"
      >
        <input
          type="color"
          value={isCustom ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          className="sr-only"
        />
        <span className="sr-only">Custom color</span>
      </label>
    </div>
  );
}

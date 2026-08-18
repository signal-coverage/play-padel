import { COURT_COLOR_OPTIONS } from "./consts";

export function isPresetColor(color: string): boolean {
  return COURT_COLOR_OPTIONS.some(
    (option) => option.value.toLowerCase() === color.toLowerCase(),
  );
}

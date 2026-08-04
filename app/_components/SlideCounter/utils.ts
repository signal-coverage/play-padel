export function formatSlideCounter(current: number, total: number): string {
  return `${String(current).padStart(1, "0")} / ${total}`;
}

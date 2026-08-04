function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatSlotRange(start: Date, end: Date): string {
  const dateLabel = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return `${dateLabel}, ${formatTime(start)} – ${formatTime(end)}`;
}

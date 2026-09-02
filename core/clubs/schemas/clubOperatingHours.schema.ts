// ClubOperatingHoursEntry[] has the exact same shape as courts' own weekly
// availability template (dayOfWeek 0-6, HH:mm start/end, endTime > startTime)
// — reused directly rather than duplicating the same validation twice.
export { weeklyAvailabilityTemplateSchema as clubOperatingHoursSchema } from "@/core/courts/schemas/court.schema";

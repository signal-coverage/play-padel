import type { Plan } from "@/core/organizations/types";

export const PLAN_DESCRIPTIONS: Record<Plan, string> = {
  FREE: "Get started with the basics. Plugins are not included.",
  CONSULTING_ROOM: "For a single practitioner managing their own practice.",
  MEDICAL_CENTER: "For clinics with multiple professionals and specialties.",
  HOSPITAL: "For larger institutions with advanced needs.",
  CUSTOM: "A tailored plan built around your organization's requirements.",
};

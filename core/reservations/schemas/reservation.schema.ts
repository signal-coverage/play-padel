import { z } from "zod";
import { MAX_RESERVATION_PARTNERS } from "@/core/reservations/consts";

export const createReservationSchema = z
  .object({
    userId: z.string().min(1, "User is required"),
    courtId: z.string().min(1, "Court is required"),
    scheduledStart: z.string().min(1, "Start date/time is required"),
    scheduledEnd: z.string().min(1, "End date/time is required"),
    notes: z.string().optional(),
    // Optional, additive co-player tagging (see prisma/schema.prisma's
    // ReservationPartner). Further validated (no self-tagging, must be real
    // existing players) by reservationPartners.service.ts's
    // validatePartnerIds — this schema only enforces shape and the count cap.
    partnerIds: z
      .array(z.string().min(1))
      .max(MAX_RESERVATION_PARTNERS, "You can tag at most 3 partners")
      .optional(),
  })
  .refine(
    (data) => {
      if (!data.scheduledStart || !data.scheduledEnd) return true;
      return new Date(data.scheduledEnd) > new Date(data.scheduledStart);
    },
    {
      message: "End date/time must be after start date/time",
      path: ["scheduledEnd"],
    },
  );

export const updateReservationSchema = z.object({
  userId: z.string().optional(),
  courtId: z.string().optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;

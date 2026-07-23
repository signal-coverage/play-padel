"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getOrCreateAppUser } from "@/lib/dal";
import {
  PaymentProviderNotConfiguredError,
  createPreference,
} from "@/lib/payments";
import {
  ReservationForbiddenError,
  ReservationNotFoundError,
  SlotUnavailableError,
  cancelReservation,
  createReservation,
} from "@/lib/reservations";

export type ReservationActionState = {
  error?: string;
};

async function getRequestBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

/**
 * Books a slot (spec: "Instant Booking" / "Pending Booking"). Free-club
 * bookings confirm immediately and redirect to the reservations list;
 * deposit-club bookings create a PENDING_PAYMENT reservation and redirect
 * the user to the Mercado Pago checkout `init_point`.
 */
export async function createReservationAction(
  _prevState: ReservationActionState,
  formData: FormData
): Promise<ReservationActionState> {
  const user = await getOrCreateAppUser();

  const courtId = String(formData.get("courtId") ?? "");
  const startsAt = new Date(String(formData.get("startsAt") ?? ""));
  const endsAt = new Date(String(formData.get("endsAt") ?? ""));

  if (
    !courtId ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime())
  ) {
    return { error: "Invalid slot selection." };
  }

  let result;
  try {
    result = await createReservation({
      courtId,
      userId: user.id,
      startsAt,
      endsAt,
    });
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return { error: error.message };
    }
    console.error("createReservationAction failed", error);
    return { error: "Something went wrong creating your reservation." };
  }

  if (result.kind === "confirmed") {
    redirect("/reservations");
  }

  try {
    const baseUrl = await getRequestBaseUrl();
    const { initPoint } = await createPreference({
      reservation: result.reservation,
      payment: result.payment,
      club: result.club,
      baseUrl,
    });
    redirect(initPoint);
  } catch (error) {
    if (error instanceof PaymentProviderNotConfiguredError) {
      // Known/expected external prerequisite gap in this environment (see
      // .env.example) — the reservation row exists as PENDING_PAYMENT and
      // will lazily expire in 30 minutes if never paid. Surface this
      // clearly instead of a generic 500.
      console.error(
        "Mercado Pago is not configured — reservation stays PENDING_PAYMENT until it expires.",
        error
      );
      return {
        error:
          "Payment provider is not configured in this environment. Your slot was reserved as pending and will expire automatically.",
      };
    }
    console.error("Mercado Pago preference creation failed", error);
    return {
      error:
        "Could not start the payment. Your slot was reserved as pending and will expire automatically.",
    };
  }
}

/**
 * Cancels the current user's own reservation (spec: "Cancellation") — no
 * refund call, deposit is fully forfeited (spec: "Forfeiture on
 * Cancellation").
 */
export async function cancelReservationAction(
  _prevState: ReservationActionState,
  formData: FormData
): Promise<ReservationActionState> {
  const user = await getOrCreateAppUser();
  const reservationId = String(formData.get("reservationId") ?? "");

  if (!reservationId) {
    return { error: "Invalid reservation." };
  }

  try {
    await cancelReservation({ reservationId, userId: user.id });
  } catch (error) {
    if (error instanceof ReservationNotFoundError) {
      return { error: error.message };
    }
    if (error instanceof ReservationForbiddenError) {
      return { error: error.message };
    }
    console.error("cancelReservationAction failed", error);
    return { error: "Something went wrong cancelling your reservation." };
  }

  redirect("/reservations");
}

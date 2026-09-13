import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

const DEFAULT_ERROR_MESSAGE = "Something went wrong";

type RouteHandler<Args extends unknown[]> = (
  ...args: Args
) => Promise<Response> | Response;

/**
 * Wraps a Next.js App Router route handler (any HTTP verb, with or without
 * a dynamic `{ params }` second argument) so an uncaught thrown/rejected
 * error never falls through to Next's own default error handling. Instead:
 *
 *   1. Reported to Sentry via captureException — instrumentation.ts's
 *      onRequestError only sees errors that escape all the way past Next's
 *      own route boundary, so an error caught here needs its own explicit
 *      report.
 *   2. Turned into this app's standard `{ error }` JSON shape (500) instead
 *      of a generic framework error page — consistent with what every
 *      frontend hooks.ts file expects when it does `await res.json()`.
 *
 * This is a last-resort net for routes that have NO try/catch of their own
 * at all. A route with its own business-error handling (see
 * app/api/clubs/courts/route.ts's DuplicateCourtNameError -> 409 mapping)
 * keeps that logic untouched — wrap it too; this wrapper only ever reacts to
 * whatever the route's own try/catch didn't already handle.
 *
 * The raw error message is never returned to the client — only logged
 * server-side/to Sentry — since an unexpected exception's message may
 * contain internal details (a Prisma error, a third-party SDK error, ...).
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: RouteHandler<Args>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      Sentry.captureException(err);
      console.error("[withErrorHandling] Unhandled route error:", err);
      return NextResponse.json(
        { error: DEFAULT_ERROR_MESSAGE },
        { status: 500 },
      );
    }
  };
}

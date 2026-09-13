import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const { captureExceptionMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionMock,
}));

import { withErrorHandling } from "./withErrorHandling";

describe("withErrorHandling", () => {
  beforeEach(() => {
    captureExceptionMock.mockReset();
  });

  it("returns the wrapped handler's response unchanged on success", async () => {
    const handler = vi.fn(async () =>
      NextResponse.json({ ok: true }, { status: 201 }),
    );
    const wrapped = withErrorHandling(handler);

    const response = await wrapped();
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ ok: true });
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("forwards every argument through to the wrapped handler unchanged", async () => {
    const handler = vi.fn(async (request: unknown, context: unknown) =>
      NextResponse.json({ received: { request, context } }),
    );
    const wrapped = withErrorHandling(handler);
    const request = { url: "http://localhost/api/thing" };
    const context = { params: Promise.resolve({ id: "1" }) };

    await wrapped(request, context);

    expect(handler).toHaveBeenCalledWith(request, context);
  });

  it("catches a thrown error, reports it to Sentry, and returns the app's standard 500 {error} JSON shape", async () => {
    const handler = vi.fn(async () => {
      throw new Error("boom");
    });
    const wrapped = withErrorHandling(handler);

    const response = await wrapped();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(typeof body.error).toBe("string");
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error));
  });

  it("catches a rejected promise the same way as a synchronously thrown error", async () => {
    const handler = vi.fn(() => Promise.reject(new Error("async boom")));
    const wrapped = withErrorHandling(handler);

    const response = await wrapped();

    expect(response.status).toBe(500);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });

  it("never leaks the raw error message to the client", async () => {
    const handler = vi.fn(async () => {
      throw new Error("raw internal secret detail");
    });
    const wrapped = withErrorHandling(handler);

    const response = await wrapped();
    const body = await response.json();

    expect(JSON.stringify(body)).not.toMatch(/raw internal secret detail/);
  });
});

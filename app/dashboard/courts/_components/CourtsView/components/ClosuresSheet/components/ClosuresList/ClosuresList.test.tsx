// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { ClosuresList } from "./ClosuresList";
import type { CourtClosure } from "@/core/courts/types";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function makeClosure(overrides: Partial<CourtClosure> = {}): CourtClosure {
  return {
    id: "closure_1",
    courtId: "court_1",
    startsAt: new Date("2026-01-01T10:00:00.000Z"),
    endsAt: new Date("2026-01-01T12:00:00.000Z"),
    reason: "Maintenance",
    createdAt: new Date("2026-01-01T09:00:00.000Z"),
    ...overrides,
  };
}

describe("ClosuresList", () => {
  it('flips a closure from "Activo" to "Pasado" on its own once its endsAt passes, with no prop change or remount', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T11:00:00.000Z")); // before endsAt

    const closure = makeClosure();
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <ClosuresList
          closures={[closure]}
          onCancel={vi.fn()}
          cancellingClosureId={null}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Activo")).toBeInTheDocument();

    // Time passes well beyond endsAt while the sheet stays open — same
    // component instance, same closures array, no re-render triggered by
    // the parent. The component's own refresh interval must pick this up.
    vi.setSystemTime(new Date("2026-01-01T13:00:00.000Z")); // after endsAt
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(screen.getByText("Pasado")).toBeInTheDocument();
    expect(screen.queryByText("Activo")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cancelar/i }),
    ).not.toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CourtFormSheet } from "./CourtFormSheet";
import { MAX_COURT_PHOTO_SIZE_BYTES } from "@/core/courts/validation";

// jsdom doesn't implement ResizeObserver, but Radix-backed fields (Switch,
// the surface radio group) rely on it internally — same stub CourtsView.test.tsx
// and BulkEditCourtsSheet.test.tsx already use.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const NO_OPERATING_HOURS = { operatingHours: [] };

function renderSheet(
  fetchImpl: (url: string, init?: RequestInit) => Promise<unknown>,
  overrides: Partial<React.ComponentProps<typeof CourtFormSheet>> = {},
) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const onOpenChange = vi.fn();
  const onSubmit = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <CourtFormSheet
        open
        onOpenChange={onOpenChange}
        court={null}
        onSubmit={onSubmit}
        isSubmitting={false}
        {...overrides}
      />
    </QueryClientProvider>,
  );

  return { fetchMock, onOpenChange, onSubmit };
}

async function fillMinimumFields() {
  fireEvent.change(screen.getByLabelText(/^name/i), {
    target: { value: "Court 1" },
  });
  fireEvent.click(
    within(screen.getByRole("group", { name: /^surface/i })).getByRole(
      "radio",
      { name: "Concrete" },
    ),
  );
  fireEvent.change(screen.getByLabelText(/reservation fee/i), {
    target: { value: "5000" },
  });

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /create court/i }),
    ).not.toBeDisabled();
  });
}

beforeEach(() => {});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CourtFormSheet", () => {
  it("keeps the sheet open with the staged photo intact when onSubmit rejects, so the owner can retry, without leaking an unhandled rejection", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("upload failed"));
    const { onOpenChange } = renderSheet(
      async (url) => {
        if (url === "/api/clubs/operating-hours") {
          return { ok: true, json: async () => NO_OPERATING_HOURS };
        }
        throw new Error(`unexpected fetch: ${url}`);
      },
      { onSubmit },
    );

    await fillMinimumFields();

    const file = new File(["photo"], "court.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Upload picture"), {
      target: { files: [file] },
    });

    // submit() must swallow onSubmit's rejection itself — react-hook-form's
    // handleSubmit(submit) is invoked from a plain onClick, so nothing else
    // is ever awaiting the promise it returns. If submit() re-throws (or
    // simply never catches), that rejection reaches the process with no
    // handler attached.
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => {
      unhandledRejections.push(reason);
    };
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      fireEvent.click(screen.getByRole("button", { name: /create court/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      // Give any unhandled rejection a full macrotask turn to surface.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(unhandledRejections).toHaveLength(0);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }

    // The Sheet does not close on a failed submit.
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(
      screen.getByRole("heading", { name: "New court" }),
    ).toBeInTheDocument();

    // The staged photo file is still there, ready for the owner to just
    // retry — proven by the preview image still rendering (PhotoField shows
    // an <img> for a staged file instead of the placeholder icon).
    expect(document.querySelector('img[alt=""]')).toBeInTheDocument();
  });

  it("shows the 5MB limit upfront in the Photo field, computed from the shared constant", () => {
    renderSheet(async (url) => {
      if (url === "/api/clubs/operating-hours") {
        return { ok: true, json: async () => NO_OPERATING_HOURS };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const expectedMb = MAX_COURT_PHOTO_SIZE_BYTES / (1024 * 1024);
    expect(
      screen.getByText(new RegExp(`max ${expectedMb}MB`, "i")),
    ).toBeInTheDocument();
  });
});

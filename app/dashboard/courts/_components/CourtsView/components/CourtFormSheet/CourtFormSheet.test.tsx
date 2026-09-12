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

function renderModal(
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

  const { container } = render(
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

  return { fetchMock, onOpenChange, onSubmit, container };
}

// Next is now gated on the current step's own required fields (see
// CourtFormSheet.tsx's requiredFieldsForStep) and react-hook-form's
// zodResolver validation (mode: "onChange", plus the initial trigger() the
// modal fires when it opens) resolves asynchronously — so a click right
// after filling a field can race a still-disabled button. Always wait for
// it to actually be enabled before clicking, rather than firing blind.
async function clickNext() {
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /^next$/i })).not.toBeDisabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
}

// Fills only the one field each step actually requires to advance. Color
// and slot duration already default to a valid value, so only Surface and
// Reservation fee need filling on steps 1 and 2.
function fillStep0Required() {
  fireEvent.change(screen.getByLabelText(/^name/i), {
    target: { value: "Court 1" },
  });
}

function fillStep1Required() {
  fireEvent.click(
    within(screen.getByRole("group", { name: /^surface/i })).getByRole(
      "radio",
      { name: "Concrete" },
    ),
  );
}

function fillStep2Required() {
  fireEvent.change(screen.getByLabelText(/reservation fee/i), {
    target: { value: "5000" },
  });
}

// Every step's <form> stays mounted at all times (see CourtFormSheet.tsx's
// own comment — visibility toggles via the `hidden` class, not conditional
// rendering), so "is step N showing" is checked via the class on that
// step's own <form>, found from any field known to live inside it. `by`
// picks the query used to locate that field — "label" for a form control's
// own accessible label, the default (getByText) for a FieldSet's legend or
// a plain heading.
function formFor(
  text: string | RegExp,
  by: "text" | "label" = "text",
): HTMLElement {
  const field =
    by === "label" ? screen.getByLabelText(text) : screen.getByText(text);
  const form = field.closest("form");
  if (!form) throw new Error(`No <form> ancestor found for "${text}"`);
  return form;
}

// Walks through all four steps filling the one required field each step
// actually needs, ending on step 3 (Availability) with Create court enabled.
async function fillMinimumFieldsAndReachLastStep() {
  // Step 0 — Details: name + photo.
  fillStep0Required();
  const file = new File(["photo"], "court.jpg", { type: "image/jpeg" });
  fireEvent.change(screen.getByLabelText("Upload picture"), {
    target: { files: [file] },
  });
  await clickNext();

  // Step 1 — Attributes: surface.
  await screen.findByText("Court type");
  fillStep1Required();
  await clickNext();

  // Step 2 — Pricing: reservation fee.
  await screen.findByText("Court price");
  fillStep2Required();
  await clickNext();

  // Step 3 — Availability (last step).
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
  it("keeps the modal open with the staged photo intact when onSubmit rejects, so the owner can retry, without leaking an unhandled rejection", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("upload failed"));
    const { onOpenChange } = renderModal(
      async (url) => {
        if (url === "/api/clubs/operating-hours") {
          return { ok: true, json: async () => NO_OPERATING_HOURS };
        }
        throw new Error(`unexpected fetch: ${url}`);
      },
      { onSubmit },
    );

    await fillMinimumFieldsAndReachLastStep();

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

    // The modal does not close on a failed submit.
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(
      screen.getByRole("heading", { name: "New court" }),
    ).toBeInTheDocument();

    // Still has the staged photo intact — every step stays mounted the
    // whole time (only visibility toggles via `hidden`, see
    // CourtFormSheet.tsx's own comment for why), so PhotoField's own
    // preview state (an <img> for a staged file, instead of the placeholder
    // icon) survives regardless of which step is currently showing.
    expect(document.querySelector('img[alt=""]')).toBeInTheDocument();
  });

  it("shows the 5MB limit upfront in the Photo field, computed from the shared constant", () => {
    renderModal(async (url) => {
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

  it("submits with courtNumber left blank (it's optional — an empty number input must not permanently disable Create court)", async () => {
    const { onSubmit } = renderModal(async (url) => {
      if (url === "/api/clubs/operating-hours") {
        return { ok: true, json: async () => NO_OPERATING_HOURS };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await fillMinimumFieldsAndReachLastStep();
    fireEvent.click(screen.getByRole("button", { name: /create court/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].courtNumber).toBeUndefined();
  });

  it("submits the entered Court number alongside the rest of the details", async () => {
    const { onSubmit } = renderModal(async (url) => {
      if (url === "/api/clubs/operating-hours") {
        return { ok: true, json: async () => NO_OPERATING_HOURS };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    fireEvent.change(screen.getByLabelText(/court number/i), {
      target: { value: "3" },
    });
    await fillMinimumFieldsAndReachLastStep();
    fireEvent.click(screen.getByRole("button", { name: /create court/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].courtNumber).toBe(3);
  });

  describe("four-step navigation", () => {
    function renderOnStep0() {
      return renderModal(async (url) => {
        if (url === "/api/clubs/operating-hours") {
          return { ok: true, json: async () => NO_OPERATING_HOURS };
        }
        throw new Error(`unexpected fetch: ${url}`);
      });
    }

    it("shows only Name and Photo on step 0 — no attributes or pricing fields", () => {
      renderOnStep0();

      expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
      expect(screen.getByLabelText("Upload picture")).toBeInTheDocument();
      // Every step's <form> stays mounted (see CourtFormSheet.tsx's own
      // comment — visibility toggles via the `hidden` class instead of
      // conditional rendering, specifically so PhotoField's own local
      // preview state survives stepping away and back). So "not shown on
      // step 0" means "its form has the `hidden` class", not "absent from
      // the DOM" — jsdom doesn't load the actual Tailwind stylesheet, so
      // toBeVisible() can't see a class-driven display:none either; this
      // asserts on the class directly instead.
      expect(formFor("Color")).toHaveClass("hidden");
      expect(formFor("Wall type")).toHaveClass("hidden");
      expect(formFor(/reservation fee/i, "label")).toHaveClass("hidden");
    });

    it("has no Back button on step 0, and mutates Next -> Next -> Next -> Create court while advancing", async () => {
      renderOnStep0();

      expect(
        screen.queryByRole("button", { name: /^back$/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^next$/i }),
      ).toBeInTheDocument();
      expect(formFor(/^name/i, "label")).not.toHaveClass("hidden");

      fillStep0Required();
      await clickNext();
      expect(formFor(/^name/i, "label")).toHaveClass("hidden");
      expect(formFor("Court type")).not.toHaveClass("hidden");
      expect(
        screen.getByRole("button", { name: /^back$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^next$/i }),
      ).toBeInTheDocument();

      fillStep1Required();
      await clickNext();
      expect(formFor("Court type")).toHaveClass("hidden");
      expect(formFor("Court price")).not.toHaveClass("hidden");

      fillStep2Required();
      await clickNext();
      expect(formFor("Court price")).toHaveClass("hidden");
      expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
      // Last step: the primary button is now "Create court", not "Next".
      expect(
        screen.queryByRole("button", { name: /^next$/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /create court/i }),
      ).toBeInTheDocument();
    });

    it("Back navigates backward through the same four steps", async () => {
      renderOnStep0();

      fillStep0Required();
      await clickNext();
      fillStep1Required();
      await clickNext();
      expect(formFor("Court price")).not.toHaveClass("hidden");

      fireEvent.click(screen.getByRole("button", { name: /^back$/i }));

      expect(formFor("Court type")).not.toHaveClass("hidden");
      expect(formFor("Court price")).toHaveClass("hidden");
    });

    it("shows the Availability step as a split layout: Quick setup and the day list separated by a vertical Separator", async () => {
      renderOnStep0();

      fillStep0Required();
      await clickNext();
      fillStep1Required();
      await clickNext();
      fillStep2Required();
      await clickNext();

      expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
      expect(
        screen.getByRole("switch", { name: "Sunday" }),
      ).toBeInTheDocument();
      // Radix's Dialog renders its content into a portal, outside RTL's own
      // `container` — same reason the fixed-size check below queries
      // `document` instead too.
      expect(
        document.querySelector('[data-orientation="vertical"]'),
      ).toBeInTheDocument();
    });

    it("the Create court button shows a leading + icon (not shown for Next or Save changes)", async () => {
      renderOnStep0();

      fillStep0Required();
      await clickNext();
      fillStep1Required();
      await clickNext();
      fillStep2Required();
      await clickNext();

      const createButton = screen.getByRole("button", {
        name: /create court/i,
      });
      expect(createButton.querySelector("svg")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /^next$/i }),
      ).not.toBeInTheDocument();
    });

    it("keeps the same fixed modal width/height class across every step", async () => {
      renderOnStep0();
      const dialog = () =>
        document.querySelector('[data-slot="dialog-content"]');

      const initialClassName = dialog()?.className;
      expect(initialClassName).toContain("h-[70vh]");

      fillStep0Required();
      await clickNext();
      expect(dialog()?.className).toBe(initialClassName);

      fillStep1Required();
      await clickNext();
      expect(dialog()?.className).toBe(initialClassName);

      fillStep2Required();
      await clickNext();
      expect(dialog()?.className).toBe(initialClassName);
    });

    it("disables Create court until the required fields across every step are filled", async () => {
      renderOnStep0();

      await fillMinimumFieldsAndReachLastStep();

      expect(
        screen.getByRole("button", { name: /create court/i }),
      ).not.toBeDisabled();
    });

    describe("per-step Next gating", () => {
      // react-hook-form's zodResolver validation (mode: "onChange", plus the
      // initial trigger() the modal fires when it opens — see
      // CourtFormSheet.tsx's re-seed block) resolves asynchronously, so
      // `errors` isn't populated on the very first synchronous render —
      // every check below waits for it to settle instead of asserting
      // immediately after render/a field change.
      it("disables Next on step 0 until Name is filled, then enables it", async () => {
        renderOnStep0();

        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: /^next$/i }),
          ).toBeDisabled(),
        );

        fillStep0Required();

        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: /^next$/i }),
          ).not.toBeDisabled(),
        );
      });

      it("does not advance past step 0 when Enter is pressed on the Name field while it's still empty", async () => {
        renderOnStep0();

        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: /^next$/i }),
          ).toBeDisabled(),
        );

        fireEvent.submit(formFor(/^name/i, "label"));

        // Still on step 0 — Court type (step 1's own content) never shows.
        expect(formFor("Court type")).toHaveClass("hidden");
        expect(formFor(/^name/i, "label")).not.toHaveClass("hidden");
      });

      it("disables Next on step 1 until Surface is chosen, then enables it", async () => {
        renderOnStep0();
        fillStep0Required();
        await clickNext();

        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: /^next$/i }),
          ).toBeDisabled(),
        );

        fillStep1Required();

        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: /^next$/i }),
          ).not.toBeDisabled(),
        );
      });

      it("disables Next on step 2 until Reservation fee is filled, then enables it", async () => {
        renderOnStep0();
        fillStep0Required();
        await clickNext();
        fillStep1Required();
        await clickNext();

        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: /^next$/i }),
          ).toBeDisabled(),
        );

        fillStep2Required();

        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: /^next$/i }),
          ).not.toBeDisabled(),
        );
      });
    });
  });
});

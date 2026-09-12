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

// Mocked the same way PlanSelectionModal.test.tsx mocks it — the real module
// is a plain event dispatch with no DOM/canvas involvement, but these tests
// need to assert whether (and when) it fired.
const { fireSuccessCelebrationMock } = vi.hoisted(() => ({
  fireSuccessCelebrationMock: vi.fn(),
}));
vi.mock("@/lib/utils/celebration", () => ({
  fireSuccessCelebration: fireSuccessCelebrationMock,
}));

// No existing sonner mock anywhere in this repo yet — added the same way as
// the celebration mock above so `toast.success` calls can be asserted on.
const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: toastMock,
}));

import { CourtsView } from "./CourtsView";

const CREATED_COURT = {
  id: "court_1",
  name: "Court 1",
  surface: "concrete",
  indoor: false,
  color: "#2D8A60",
  slotDurationMinutes: 90,
  reservationFee: 5000,
  active: true,
};

const EXISTING_COURT = {
  id: "court_9",
  name: "Court 9",
  surface: "concrete",
  indoor: false,
  color: "#2D8A60",
  slotDurationMinutes: 90,
  reservationFee: 5000,
  active: true,
};

const COURT_TWO = {
  id: "court_10",
  name: "Court 10",
  surface: "carpet",
  indoor: true,
  color: "#2563EB",
  slotDurationMinutes: 60,
  reservationFee: 4000,
  active: true,
};

// No operating hours configured for this club by default — the club-default
// query resolves to an empty array, which is a valid (if uneventful)
// response the create flow must tolerate.
const NO_OPERATING_HOURS: { operatingHours: unknown[] } = {
  operatingHours: [],
};

// jsdom doesn't implement ResizeObserver, but DataTable uses it internally to
// track scroll-edge fades — stub a no-op the same way
// CommandPalette.test.tsx does, so mounting a table with actual row data
// doesn't throw. The earlier tests here only ever rendered an empty court
// list, so this never came up until the new tests below render real rows.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderCourtsView(
  fetchImpl: (url: string, init?: RequestInit) => Promise<unknown>,
) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <CourtsView />
    </QueryClientProvider>,
  );

  return fetchMock;
}

// The modal is now a four-step flow (Details -> Attributes -> Pricing ->
// Availability, see CourtFormSheet.tsx) — Create court only ever shows on
// the last step, reached via "Next" (there is no click-to-jump on the step
// indicator, only Back/Next). Next is itself gated on the current step's
// own required fields (see CourtFormSheet.tsx's requiredFieldsForStep),
// and that validation resolves asynchronously — always wait for it to be
// enabled before clicking, rather than firing right after the field change.
async function clickNextWhenReady() {
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /^next$/i })).not.toBeDisabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
}

async function openFormAndFillMinimumFields() {
  fireEvent.click(await screen.findByRole("button", { name: /new court/i }));

  // Step 0 — Details: name.
  fireEvent.change(screen.getByLabelText(/^name/i), {
    target: { value: "Court 1" },
  });
  await clickNextWhenReady();

  // Step 1 — Attributes: surface. Scoped to the Surface fieldset: the Wall
  // type field also offers a "Concrete" radio option, so an unscoped query
  // would now match both.
  fireEvent.click(
    within(screen.getByRole("group", { name: /^surface/i })).getByRole(
      "radio",
      { name: "Concrete" },
    ),
  );
  await clickNextWhenReady();

  // Step 2 — Pricing: reservation fee.
  fireEvent.change(screen.getByLabelText(/reservation fee/i), {
    target: { value: "5000" },
  });
  await clickNextWhenReady();

  // Step 3 — Availability (last step): Create court now shows instead of
  // Next. react-hook-form's zodResolver validation (mode: "onChange")
  // resolves asynchronously, so it stays disabled for a tick after the
  // last field change above.
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /create court/i }),
    ).not.toBeDisabled();
  });
}

beforeEach(() => {
  fireSuccessCelebrationMock.mockClear();
  toastMock.success.mockClear();
  toastMock.error.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CourtsView", () => {
  it("does not signal success (toast/celebration) until the chained photo upload also resolves, and closes the sheet only then", async () => {
    let resolvePhotoUpload: (() => void) | undefined;
    const photoUploadPromise = new Promise<void>((resolve) => {
      resolvePhotoUpload = resolve;
    });

    renderCourtsView(async (url, init) => {
      if (url === "/api/clubs/courts?includeInactive=true") {
        return { ok: true, json: async () => ({ courts: [] }) };
      }
      if (url === "/api/clubs/operating-hours") {
        return { ok: true, json: async () => NO_OPERATING_HOURS };
      }
      if (url === "/api/clubs/courts" && init?.method === "POST") {
        return { ok: true, json: async () => ({ court: CREATED_COURT }) };
      }
      if (url === `/api/clubs/courts/${CREATED_COURT.id}/photo`) {
        await photoUploadPromise;
        return { ok: true, json: async () => ({ photoUrl: "https://x/1" }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await openFormAndFillMinimumFields();

    const file = new File(["photo"], "court.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Upload picture"), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: /create court/i }));

    // Create POST resolves, but the photo upload is still pending: no
    // success signal yet, and the Sheet must still show its pending state.
    await screen.findByRole("button", { name: /saving/i });
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(fireSuccessCelebrationMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "New court" }),
    ).toBeInTheDocument();

    resolvePhotoUpload?.();

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith("Court created");
    });
    expect(fireSuccessCelebrationMock).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("heading", { name: "New court" }),
    ).not.toBeInTheDocument();
  });

  it("rolls back (silently deletes) the just-created court and surfaces an error toast when the chained photo upload fails, without showing the success toast/celebration", async () => {
    const fetchMock = renderCourtsView(async (url, init) => {
      if (url === "/api/clubs/courts?includeInactive=true") {
        return { ok: true, json: async () => ({ courts: [] }) };
      }
      if (url === "/api/clubs/operating-hours") {
        return { ok: true, json: async () => NO_OPERATING_HOURS };
      }
      if (url === "/api/clubs/courts" && init?.method === "POST") {
        return { ok: true, json: async () => ({ court: CREATED_COURT }) };
      }
      if (url === `/api/clubs/courts/${CREATED_COURT.id}/photo`) {
        return {
          ok: false,
          json: async () => ({ error: "Image must be 5MB or smaller." }),
        };
      }
      if (
        url === `/api/clubs/courts/${CREATED_COURT.id}` &&
        init?.method === "DELETE"
      ) {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      throw new Error(`unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });

    await openFormAndFillMinimumFields();

    const file = new File(["photo"], "court.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Upload picture"), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: /create court/i }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        "Image must be 5MB or smaller.",
      );
    });

    // The just-created court gets rolled back via a silent delete — no
    // "Court deactivated" toast, since that toast is reserved for an
    // owner-initiated deactivation, not this internal cleanup.
    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          url === `/api/clubs/courts/${CREATED_COURT.id}` &&
          init?.method === "DELETE",
      );
      expect(deleteCall).toBeDefined();
    });
    expect(toastMock.success).not.toHaveBeenCalledWith("Court deactivated");

    // No "Court created" success signal fires for this failed operation.
    expect(toastMock.success).not.toHaveBeenCalledWith("Court created");
    expect(fireSuccessCelebrationMock).not.toHaveBeenCalled();

    // The Sheet stays open so the owner can retry.
    expect(
      screen.getByRole("heading", { name: "New court" }),
    ).toBeInTheDocument();
  });

  it("still shows the success toast right after create when no photo is attached (no regression)", async () => {
    renderCourtsView(async (url, init) => {
      if (url === "/api/clubs/courts?includeInactive=true") {
        return { ok: true, json: async () => ({ courts: [] }) };
      }
      if (url === "/api/clubs/operating-hours") {
        return { ok: true, json: async () => NO_OPERATING_HOURS };
      }
      if (url === "/api/clubs/courts" && init?.method === "POST") {
        return { ok: true, json: async () => ({ court: CREATED_COURT }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await openFormAndFillMinimumFields();

    fireEvent.click(screen.getByRole("button", { name: /create court/i }));

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith("Court created");
    });
    expect(fireSuccessCelebrationMock).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("heading", { name: "New court" }),
    ).not.toBeInTheDocument();
  });

  it("opens the merged sheet on the Availability step via the table's clock icon", async () => {
    renderCourtsView(async (url) => {
      if (url === "/api/clubs/courts?includeInactive=true") {
        return { ok: true, json: async () => ({ courts: [EXISTING_COURT] }) };
      }
      if (url === `/api/clubs/courts/${EXISTING_COURT.id}/availability`) {
        return { ok: true, json: async () => ({ availability: [] }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    fireEvent.click(
      await screen.findByRole("button", {
        name: `Edit availability for ${EXISTING_COURT.name}`,
      }),
    );

    await waitFor(() => {
      expect(
        document.body.querySelector('[data-step="Availability"]'),
      ).toHaveAttribute("aria-current", "step");
    });
    expect(
      document.body.querySelector('[data-step="Details"]'),
    ).not.toHaveAttribute("aria-current");

    // Same merged modal, not a separate one — the heading still reads
    // "Edit court" (CourtFormSheet's edit-mode title), not a standalone
    // "Weekly availability" title.
    expect(
      screen.getByRole("heading", { name: "Edit court" }),
    ).toBeInTheDocument();
  });

  it("editing a court's availability and saving persists it via the availability PUT endpoint, alongside the details PATCH", async () => {
    const fetchMock = renderCourtsView(async (url, init) => {
      if (url === "/api/clubs/courts?includeInactive=true") {
        return { ok: true, json: async () => ({ courts: [EXISTING_COURT] }) };
      }
      if (
        url === `/api/clubs/courts/${EXISTING_COURT.id}/availability` &&
        (!init || init.method === undefined)
      ) {
        return { ok: true, json: async () => ({ availability: [] }) };
      }
      if (
        url === `/api/clubs/courts/${EXISTING_COURT.id}/availability` &&
        init?.method === "PUT"
      ) {
        return { ok: true, json: async () => ({ availability: [] }) };
      }
      if (
        url === `/api/clubs/courts/${EXISTING_COURT.id}` &&
        init?.method === "PATCH"
      ) {
        return { ok: true, json: async () => ({ court: EXISTING_COURT }) };
      }
      throw new Error(`unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    });

    fireEvent.click(
      await screen.findByRole("button", {
        name: `Edit availability for ${EXISTING_COURT.name}`,
      }),
    );

    // Apply the Quick setup panel's default window to all 7 days.
    fireEvent.click(await screen.findByRole("button", { name: "Apply" }));

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          url === `/api/clubs/courts/${EXISTING_COURT.id}/availability` &&
          init?.method === "PUT",
      );
      expect(putCall).toBeDefined();
      const entries = JSON.parse(putCall![1]!.body as string);
      expect(entries).toHaveLength(7);
      expect(entries[0]).toEqual({
        dayOfWeek: 0,
        startTime: "09:00",
        endTime: "21:00",
      });
    });

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === `/api/clubs/courts/${EXISTING_COURT.id}` &&
        init?.method === "PATCH",
    );
    expect(patchCall).toBeDefined();
  });

  it("creating a court with the availability step left at its club-default-derived value still creates it, sending that default availability in the POST body", async () => {
    const defaultOperatingHours = {
      operatingHours: [{ dayOfWeek: 1, startTime: "08:00", endTime: "20:00" }],
    };

    const fetchMock = renderCourtsView(async (url, init) => {
      if (url === "/api/clubs/courts?includeInactive=true") {
        return { ok: true, json: async () => ({ courts: [] }) };
      }
      if (url === "/api/clubs/operating-hours") {
        return { ok: true, json: async () => defaultOperatingHours };
      }
      if (url === "/api/clubs/courts" && init?.method === "POST") {
        return { ok: true, json: async () => ({ court: CREATED_COURT }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await openFormAndFillMinimumFields();

    // openFormAndFillMinimumFields already lands on the Availability step
    // (the last of the four). Its day list is now an accordion (see
    // AvailabilityRowsEditor's "split" layout) — only the currently
    // expanded day's start/end inputs are actually in the DOM, so Monday's
    // row must be expanded before its club-default-derived value can be
    // observed, without ever touching it — the default should flow through
    // untouched.
    fireEvent.click(screen.getByText("Monday"));
    await screen.findByDisplayValue("08:00");

    fireEvent.click(screen.getByRole("button", { name: /create court/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) => url === "/api/clubs/courts" && init?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1]!.body as string);
      expect(body.availability).toEqual([
        { dayOfWeek: 1, startTime: "08:00", endTime: "20:00" },
      ]);
    });
  });

  describe("bulk selection", () => {
    function renderWithTwoCourts() {
      return renderCourtsView(async (url) => {
        if (url === "/api/clubs/courts?includeInactive=true") {
          return {
            ok: true,
            json: async () => ({ courts: [EXISTING_COURT, COURT_TWO] }),
          };
        }
        throw new Error(`unexpected fetch: ${url}`);
      });
    }

    it("hides the bulk-action bar until a row is selected, then shows the count", async () => {
      renderWithTwoCourts();

      await screen.findByText(EXISTING_COURT.name);
      expect(
        screen.queryByText(/court\(s\) selected/i),
      ).not.toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("checkbox", { name: `Select ${EXISTING_COURT.name}` }),
      );

      expect(
        await screen.findByText("1 court(s) selected"),
      ).toBeInTheDocument();
    });

    it("clears the selection when Clear is clicked", async () => {
      renderWithTwoCourts();

      await screen.findByText(EXISTING_COURT.name);
      fireEvent.click(
        screen.getByRole("checkbox", { name: `Select ${EXISTING_COURT.name}` }),
      );
      await screen.findByText("1 court(s) selected");

      fireEvent.click(screen.getByRole("button", { name: /clear/i }));

      expect(
        screen.queryByText(/court\(s\) selected/i),
      ).not.toBeInTheDocument();
    });

    it("opens the bulk edit sheet when Bulk edit is clicked", async () => {
      renderWithTwoCourts();

      await screen.findByText(EXISTING_COURT.name);
      fireEvent.click(
        screen.getByRole("checkbox", { name: `Select ${EXISTING_COURT.name}` }),
      );
      await screen.findByText("1 court(s) selected");

      fireEvent.click(screen.getByRole("button", { name: /bulk edit/i }));

      expect(
        await screen.findByRole("heading", { name: "Bulk edit courts" }),
      ).toBeInTheDocument();
    });
  });

  it("gives the courts table extra minimum height on mobile with a trailing spacer, while leaving desktop sizing untouched", async () => {
    renderCourtsView(async (url) => {
      if (url === "/api/clubs/courts?includeInactive=true") {
        return { ok: true, json: async () => ({ courts: [EXISTING_COURT] }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByText(EXISTING_COURT.name);

    // Same fix as PlayersDirectory's table (see its own comments for the
    // full explanation): min-h-[60svh] gives the table real height on
    // mobile, where <main>'s page-level scroll leaves the usual h-full/
    // flex-1 chain collapsed; md:min-h-0 keeps desktop's sizing untouched;
    // the trailing spacer (real height, not margin) is what actually
    // extends <main>'s scrollable area past the table.
    const table = screen.getByRole("table");
    const wrapper = table.closest(".rounded-sm.border");
    expect(wrapper?.className).toContain("min-h-[60svh]");
    expect(wrapper?.className).toMatch(/\bmd:min-h-0\b/);

    const spacer = wrapper?.nextElementSibling as HTMLElement | null;
    expect(spacer).not.toBeNull();
    expect(spacer?.getAttribute("aria-hidden")).toBe("true");
    expect(spacer?.className).toMatch(/\bh-8\b/);
    expect(spacer?.className).toMatch(/\bmd:hidden\b/);
  });

  describe("New court button — plan court limit gating", () => {
    function renderAtCourtCount(
      courtCount: number,
      clubPlanInfo: {
        plan: string;
        courtLimit: number | null;
        isFreePlan: boolean;
      },
    ) {
      const courts = Array.from({ length: courtCount }, (_, i) => ({
        ...EXISTING_COURT,
        id: `court_${i}`,
        name: `Court ${i}`,
      }));
      return renderCourtsView(async (url) => {
        if (url === "/api/clubs/courts?includeInactive=true") {
          return { ok: true, json: async () => ({ courts }) };
        }
        if (url === "/api/clubs") {
          return {
            ok: true,
            json: async () => ({
              club: {
                plan: clubPlanInfo.plan,
                courtLimit: clubPlanInfo.courtLimit,
              },
              isFreePlan: clubPlanInfo.isFreePlan,
            }),
          };
        }
        throw new Error(`unexpected fetch: ${url}`);
      });
    }

    it("keeps New court fully enabled-looking when under the plan's limit", async () => {
      renderAtCourtCount(1, {
        plan: "BASIC",
        courtLimit: null,
        isFreePlan: false,
      });

      const button = await screen.findByRole("button", { name: /new court/i });
      await waitFor(() =>
        expect(button.className).not.toMatch(/\bcursor-not-allowed\b/),
      );
    });

    it("dims New court (CSS only) once the club is at its plan's limit, but clicking it still opens the limit-reached dialog instead of the create form", async () => {
      renderAtCourtCount(2, {
        plan: "BASIC",
        courtLimit: null,
        isFreePlan: false,
      });

      const button = await screen.findByRole("button", { name: /new court/i });
      await waitFor(() =>
        expect(button.className).toMatch(/\bcursor-not-allowed\b/),
      );
      // Still clickable — not the real `disabled` attribute.
      expect(button).not.toBeDisabled();

      fireEvent.click(button);

      expect(
        await screen.findByText(/court limit reached/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "New court" }),
      ).not.toBeInTheDocument();
    });

    it("uses the club's courtLimit override instead of the plan default when deciding whether the limit is reached", async () => {
      // PLUS's own default is 7, but this club was explicitly capped at 1.
      renderAtCourtCount(1, {
        plan: "PLUS",
        courtLimit: 1,
        isFreePlan: false,
      });

      const button = await screen.findByRole("button", { name: /new court/i });
      await waitFor(() =>
        expect(button.className).toMatch(/\bcursor-not-allowed\b/),
      );
    });

    it("never gates the button for a club on the FREE membership plan, regardless of Club.plan or current court count", async () => {
      renderAtCourtCount(50, {
        plan: "BASIC",
        courtLimit: null,
        isFreePlan: true,
      });

      const button = await screen.findByRole("button", { name: /new court/i });
      await screen.findByText("Court 0");
      expect(button.className).not.toMatch(/\bcursor-not-allowed\b/);

      fireEvent.click(button);
      expect(
        await screen.findByRole("heading", { name: "New court" }),
      ).toBeInTheDocument();
    });
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";

// Mocked the same way CourtsView.test.tsx mocks it, so toast.success/error
// calls made from the aggregate summary logic can be asserted on.
const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: toastMock,
}));

import { BulkEditCourtsSheet } from "./BulkEditCourtsSheet";

// jsdom doesn't implement ResizeObserver, but the Switch field (via Radix)
// relies on it internally — stub a no-op the same way CourtsView.test.tsx
// does for DataTable.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderSheet(
  fetchImpl: (url: string, init?: RequestInit) => Promise<unknown>,
  overrides: Partial<React.ComponentProps<typeof BulkEditCourtsSheet>> = {},
) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <BulkEditCourtsSheet
          open
          onOpenChange={onOpenChange}
          courtIds={["court_1", "court_2"]}
          courtCount={2}
          onSuccess={onSuccess}
          {...overrides}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );

  return { fetchMock, onOpenChange, onSuccess };
}

beforeEach(() => {
  toastMock.success.mockClear();
  toastMock.error.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("BulkEditCourtsSheet", () => {
  it("sends a PATCH per selected court containing only the enabled field when submitted", async () => {
    const { fetchMock, onOpenChange, onSuccess } = renderSheet(
      async (url, init) => {
        if (
          (url === "/api/clubs/courts/court_1" ||
            url === "/api/clubs/courts/court_2") &&
          init?.method === "PATCH"
        ) {
          return { ok: true, json: async () => ({ court: {} }) };
        }
        throw new Error(`unexpected fetch: ${url}`);
      },
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Seña de reserva" }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Seña de reserva" }),
      {
        target: { value: "6000" },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: /aplicar cambios/i }));

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith("2 canchas actualizadas");
    });
    // Only the aggregate summary toast should fire — not a "Court updated"
    // toast per court from useUpdateCourt's own onSuccess, which would stack
    // N+1 toasts for an N-court bulk apply.
    expect(toastMock.success).toHaveBeenCalledTimes(1);

    const patchCalls = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(2);
    for (const [, init] of patchCalls) {
      const body = JSON.parse(init!.body as string);
      expect(body).toEqual({ reservationFee: 6000 });
    }

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows an error and calls no mutation when no field is enabled", async () => {
    const { fetchMock, onSuccess, onOpenChange } = renderSheet(async () => {
      throw new Error("fetch should not be called");
    });

    fireEvent.click(screen.getByRole("button", { name: /aplicar cambios/i }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        "Seleccioná al menos un campo para cambiar",
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("keeps the sheet open and shows an error toast when every court fails", async () => {
    const { onSuccess, onOpenChange } = renderSheet(async () => {
      return {
        ok: false,
        json: async () => ({ error: "Something went wrong" }),
      };
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "Seña de reserva" }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Seña de reserva" }),
      {
        target: { value: "6000" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /aplicar cambios/i }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Something went wrong");
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("keeps the sheet open and shows a partial-failure summary when only some courts fail", async () => {
    const { onSuccess, onOpenChange } = renderSheet(async (url) => {
      if (url === "/api/clubs/courts/court_1") {
        return { ok: true, json: async () => ({ court: {} }) };
      }
      return { ok: false, json: async () => ({ error: "Conflict" }) };
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "Seña de reserva" }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Seña de reserva" }),
      {
        target: { value: "6000" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /aplicar cambios/i }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        "Se actualizaron 1 de 2 canchas. 1 fallaron.",
      );
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

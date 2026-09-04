// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MercadoPagoConnectedDialog } from "./MercadoPagoConnectedDialog";

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: toastMock,
}));

function renderDialog(
  overrides: Partial<Parameters<typeof MercadoPagoConnectedDialog>[0]> = {},
) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/clubs/bank-transfer-account" && (!init || !init.method)) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ account: null }),
      });
    }
    if (url === "/api/clubs/bank-transfer-account" && init?.method === "PUT") {
      const body = JSON.parse(init.body as string);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          account: { ...body, id: "cbta_1", clubId: "club_1" },
        }),
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const props = {
    open: true,
    onOpenChange: vi.fn(),
    ...overrides,
  };

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MercadoPagoConnectedDialog {...props} />
    </QueryClientProvider>,
  );

  return { ...utils, fetchMock, props };
}

describe("MercadoPagoConnectedDialog", () => {
  afterEach(() => {
    // This repo's vitest.config.mts does not enable `test.globals`, so
    // @testing-library/react's automatic afterEach(cleanup) registration
    // never fires — clean up the DOM explicitly between tests instead.
    cleanup();
    vi.unstubAllGlobals();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  it("renders nothing when closed", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByText("Mercado Pago connected!"),
    ).not.toBeInTheDocument();
  });

  it("shows the title/description and the embedded card's fields when open", async () => {
    renderDialog();

    expect(screen.getByText("Mercado Pago connected!")).toBeInTheDocument();
    expect(
      screen.getByText(/players can now pay for reservations/i),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/^cbu/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save and continue/i }),
    ).toBeInTheDocument();
  });

  it("submitting the embedded card with valid data calls the PUT endpoint and then closes the dialog", async () => {
    const { fetchMock, props } = renderDialog();

    await waitFor(() =>
      expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/bank name/i), {
      target: { value: "Banco Nación" },
    });
    fireEvent.change(screen.getByLabelText(/^cbu/i), {
      target: { value: "0000000000000000000000" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save and continue/i }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === "/api/clubs/bank-transfer-account" &&
            init?.method === "PUT",
        ),
      ).toBe(true),
    );

    await waitFor(() => expect(props.onOpenChange).toHaveBeenCalledWith(false));
  });

  it("clicking 'Save and continue' with an empty form closes the dialog without any fetch call", async () => {
    const { fetchMock, props } = renderDialog();

    await waitFor(() =>
      expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /save and continue/i }));

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(false);
  });
});

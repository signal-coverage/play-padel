// @vitest-environment jsdom
import type * as React from "react";
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
import { BankTransferAccountSettingsCard } from "./BankTransferAccountSettingsCard";
import type { ClubBankTransferAccount } from "./types";

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: toastMock,
}));

function renderCard(
  account: ClubBankTransferAccount | null,
  props: Partial<
    React.ComponentProps<typeof BankTransferAccountSettingsCard>
  > = {},
) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/clubs/bank-transfer-account" && (!init || !init.method)) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ account }),
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

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <BankTransferAccountSettingsCard {...props} />
    </QueryClientProvider>,
  );

  return { ...utils, fetchMock, queryClient };
}

describe("BankTransferAccountSettingsCard", () => {
  afterEach(() => {
    // This repo's vitest.config.mts does not enable `test.globals`, so
    // @testing-library/react's automatic afterEach(cleanup) registration
    // never fires — clean up the DOM explicitly between tests instead.
    cleanup();
    vi.unstubAllGlobals();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  it("renders an empty form with Save disabled when no account exists yet", async () => {
    renderCard(null);

    await waitFor(() =>
      expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/bank name/i)).toHaveValue("");
    expect(screen.getByLabelText(/^cbu/i)).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeDisabled();
  });

  it("loads and displays an existing account's values", async () => {
    renderCard({
      bankName: "Banco Nación",
      cbu: "0000000000000000000000",
      alias: "club.padel.mp",
      accountHolderName: "Club Padel Norte SA",
    });

    await waitFor(() =>
      expect(screen.getByDisplayValue("Banco Nación")).toBeInTheDocument(),
    );
    expect(
      screen.getByDisplayValue("0000000000000000000000"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("club.padel.mp")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Club Padel Norte SA")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).not.toBeDisabled();
  });

  it("submitting a valid form calls PUT with the correct body and shows a success toast", async () => {
    const { fetchMock } = renderCard(null);

    await waitFor(() =>
      expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/bank name/i), {
      target: { value: "Banco Nación" },
    });
    fireEvent.change(screen.getByLabelText(/^cbu/i), {
      target: { value: "0000000000000000000000" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === "/api/clubs/bank-transfer-account" &&
            init?.method === "PUT",
        ),
      ).toBe(true),
    );

    const putCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === "/api/clubs/bank-transfer-account" && init?.method === "PUT",
    );
    const body = JSON.parse((putCall?.[1]?.body as string) ?? "{}");
    expect(body).toEqual({
      bankName: "Banco Nación",
      cbu: "0000000000000000000000",
    });

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
  });

  it("shows a validation error for an invalid CBU and never calls the endpoint", async () => {
    const { fetchMock } = renderCard(null);

    await waitFor(() =>
      expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/bank name/i), {
      target: { value: "Banco Nación" },
    });
    fireEvent.change(screen.getByLabelText(/^cbu/i), {
      target: { value: "12345" },
    });

    expect(
      screen.getByText(/cbu must be exactly 22 digits/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(false);
  });

  it("with allowSkip and an empty form, enables the submit button and calls onDone without hitting the endpoint", async () => {
    const onDone = vi.fn();
    const { fetchMock } = renderCard(null, {
      allowSkip: true,
      onDone,
    });

    await waitFor(() =>
      expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument(),
    );

    const submitButton = screen.getByRole("button", { name: /save changes/i });
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(false);
  });

  it("renders a custom submitLabel", async () => {
    renderCard(null, { submitLabel: "Save and continue" });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /save and continue/i }),
      ).toBeInTheDocument(),
    );
  });

  it("a valid submit still calls the PUT endpoint and then calls onDone after success", async () => {
    const onDone = vi.fn();
    const { fetchMock } = renderCard(null, {
      allowSkip: true,
      onDone,
      submitLabel: "Save and continue",
    });

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

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });
});

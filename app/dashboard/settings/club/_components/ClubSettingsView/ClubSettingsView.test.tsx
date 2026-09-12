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
import { ClubSettingsView } from "./ClubSettingsView";

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: toastMock,
}));

// jsdom doesn't implement ResizeObserver, but Radix-backed fields (Switch)
// rely on it internally — same stub CourtFormSheet.test.tsx/CourtsView.test.tsx
// already use.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom doesn't implement matchMedia either — TabColumnsLayout's
// useShouldStackTabColumns hook (columns="two" below) calls it unconditionally.
function stubMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

function makeClub(overrides: Record<string, unknown> = {}) {
  return {
    id: "club_1",
    name: "Club Padel Norte",
    legalName: "",
    taxId: "",
    email: "club@example.com",
    phone: "",
    address: "",
    country: "",
    province: "",
    city: "",
    zipCode: "",
    ownerPhotoUrl: null,
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
    ...overrides,
  };
}

function renderView(
  clubsByUrl: Record<string, unknown>,
  props: { clubId?: string } = {},
) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const club = clubsByUrl[url];
    if (!club) throw new Error(`unexpected fetch: ${url}`);
    if (init?.method === "PATCH") {
      const body = JSON.parse(init.body as string);
      return Promise.resolve({
        ok: true,
        json: async () => ({ club: { ...club, ...body } }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({ club }) });
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  stubMatchMedia();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ClubSettingsView {...props} />
    </QueryClientProvider>,
  );

  return { ...utils, fetchMock, queryClient };
}

describe("ClubSettingsView", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  describe("without a clubId prop (self-club, owner path)", () => {
    it("fetches the current club from /api/clubs", async () => {
      const { fetchMock } = renderView({
        "/api/clubs": makeClub({ name: "My Own Club" }),
      });

      await waitFor(() =>
        expect(screen.getByDisplayValue("My Own Club")).toBeInTheDocument(),
      );
      expect(fetchMock.mock.calls[0][0]).toBe("/api/clubs");
    });

    it("saves via PATCH /api/clubs", async () => {
      const { fetchMock } = renderView({
        "/api/clubs": makeClub({ name: "My Own Club" }),
      });

      await waitFor(() =>
        expect(screen.getByDisplayValue("My Own Club")).toBeInTheDocument(),
      );

      screen.getByRole("button", { name: /save changes/i }).click();

      await waitFor(() =>
        expect(
          fetchMock.mock.calls.some(
            ([url, init]) => url === "/api/clubs" && init?.method === "PATCH",
          ),
        ).toBe(true),
      );
    });
  });

  describe("with a clubId prop (admin path)", () => {
    it("fetches the specified club from /api/admin/clubs/[clubId], not /api/clubs", async () => {
      const { fetchMock } = renderView(
        {
          "/api/admin/clubs/club_2": makeClub({
            id: "club_2",
            name: "Other Club",
          }),
        },
        { clubId: "club_2" },
      );

      await waitFor(() =>
        expect(screen.getByDisplayValue("Other Club")).toBeInTheDocument(),
      );
      expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/clubs/club_2");
      expect(fetchMock.mock.calls.some(([url]) => url === "/api/clubs")).toBe(
        false,
      );
    });

    it("saves via PATCH /api/admin/clubs/[clubId], not /api/clubs", async () => {
      const { fetchMock } = renderView(
        {
          "/api/admin/clubs/club_2": makeClub({
            id: "club_2",
            name: "Other Club",
          }),
        },
        { clubId: "club_2" },
      );

      await waitFor(() =>
        expect(screen.getByDisplayValue("Other Club")).toBeInTheDocument(),
      );

      screen.getByRole("button", { name: /save changes/i }).click();

      await waitFor(() =>
        expect(
          fetchMock.mock.calls.some(
            ([url, init]) =>
              url === "/api/admin/clubs/club_2" && init?.method === "PATCH",
          ),
        ).toBe(true),
      );
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => url === "/api/clubs" && init?.method === "PATCH",
        ),
      ).toBe(false);
    });
  });

  describe("switching between clubs (query key includes clubId)", () => {
    it("does not leak the previously-selected club's data when clubId changes", async () => {
      const fetchMock = vi.fn((url: string) => {
        if (url === "/api/admin/clubs/club_a") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              club: makeClub({ id: "club_a", name: "Club A" }),
            }),
          });
        }
        if (url === "/api/admin/clubs/club_b") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              club: makeClub({ id: "club_b", name: "Club B" }),
            }),
          });
        }
        throw new Error(`unexpected fetch: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);
      vi.stubGlobal("ResizeObserver", ResizeObserverStub);
      stubMatchMedia();

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <ClubSettingsView clubId="club_a" />
        </QueryClientProvider>,
      );

      await waitFor(() =>
        expect(screen.getByDisplayValue("Club A")).toBeInTheDocument(),
      );

      rerender(
        <QueryClientProvider client={queryClient}>
          <ClubSettingsView clubId="club_b" />
        </QueryClientProvider>,
      );

      await waitFor(() =>
        expect(screen.getByDisplayValue("Club B")).toBeInTheDocument(),
      );
      expect(screen.queryByDisplayValue("Club A")).not.toBeInTheDocument();
    });
  });

  describe("two-column layout redesign", () => {
    it('renders the "Basic information" heading (left column)', async () => {
      renderView({ "/api/clubs": makeClub() });

      expect(
        await screen.findByRole("heading", { name: /basic information/i }),
      ).toBeInTheDocument();
    });

    it("no longer renders an editable Logo URL input", async () => {
      renderView({ "/api/clubs": makeClub() });

      await screen.findByText(/basic information/i);
      expect(screen.queryByLabelText(/logo url/i)).not.toBeInTheDocument();
    });

    it("renders the new address/country/province/city/zip code fields, seeded from the club record", async () => {
      renderView({
        "/api/clubs": makeClub({
          address: "Av. Corrientes 1234",
          country: "Argentina",
          province: "Buenos Aires",
          city: "La Plata",
          zipCode: "1642",
        }),
      });

      await waitFor(() =>
        expect(
          screen.getByDisplayValue("Av. Corrientes 1234"),
        ).toBeInTheDocument(),
      );
      expect(screen.getByDisplayValue("1642")).toBeInTheDocument();
      expect(screen.getByText("Country")).toBeInTheDocument();
      expect(screen.getByText("Province / State")).toBeInTheDocument();
      expect(screen.getByText("City")).toBeInTheDocument();
    });

    it("renders Legal name and Tax ID in the right column, separated from the left column fields", async () => {
      const { container } = renderView({ "/api/clubs": makeClub() });

      await screen.findByText(/basic information/i);

      const separator = container.querySelector('[data-slot="separator"]');
      expect(separator).toBeInTheDocument();

      const legalNameLabel = screen.getByText(/legal name/i);
      const taxIdLabel = screen.getByText(/tax id/i);
      const clubNameLabel = screen.getByText("Name *");

      // Club name (left column) comes before the separator; Legal name/Tax ID
      // (right column) come after it.
      expect(
        clubNameLabel.compareDocumentPosition(separator as Node) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        (separator as Node).compareDocumentPosition(legalNameLabel) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        (separator as Node).compareDocumentPosition(taxIdLabel) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("saves the new fields via PATCH, round-tripping an edited address and the seeded country", async () => {
      const { fetchMock } = renderView({
        "/api/clubs": makeClub({ country: "Argentina" }),
      });

      // Wait for the club fetch's seed (reset(clubToFormValues(club))) to
      // have actually landed before editing/submitting — otherwise the
      // submit could race the async re-seed and go out with the form's
      // pre-fetch (empty) defaults instead of the seeded country.
      await waitFor(() =>
        expect(
          screen.getByDisplayValue("Club Padel Norte"),
        ).toBeInTheDocument(),
      );

      const addressInput = screen.getByLabelText(/address/i);
      fireEvent.change(addressInput, {
        target: { value: "Av. Corrientes 1234" },
      });

      screen.getByRole("button", { name: /save changes/i }).click();

      await waitFor(() => {
        const patchCall = fetchMock.mock.calls.find(
          ([url, init]) => url === "/api/clubs" && init?.method === "PATCH",
        );
        expect(patchCall).toBeTruthy();
        const body = JSON.parse(
          (patchCall as [string, RequestInit])[1]!.body as string,
        );
        expect(body.address).toBe("Av. Corrientes 1234");
        expect(body.country).toBe("Argentina");
      });
    });
  });

  describe("legal information column", () => {
    it('renders the "Legal information" heading with the same style/size as "Basic information", plus a subtitle', async () => {
      renderView({ "/api/clubs": makeClub() });

      const basicHeading = await screen.findByRole("heading", {
        name: /basic information/i,
      });
      const legalHeading = await screen.findByRole("heading", {
        name: /legal information/i,
      });

      expect(legalHeading.tagName).toBe(basicHeading.tagName);
      expect(legalHeading.className).toBe(basicHeading.className);
      expect(
        screen.getByText(/used for invoices and tax documents/i),
      ).toBeInTheDocument();
    });
  });

  describe("WhatsApp number field", () => {
    it("renders an optional WhatsApp field (no required asterisk) distinct from the general Phone field", async () => {
      renderView({ "/api/clubs": makeClub() });

      await screen.findByText(/basic information/i);
      expect(screen.getByText("Phone *")).toBeInTheDocument();
      expect(
        screen.getByText("WhatsApp (for payment receipts)"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("WhatsApp (for payment receipts) *"),
      ).not.toBeInTheDocument();
    });

    it("loads and displays the club's WhatsApp number", async () => {
      renderView({
        "/api/clubs": makeClub({ whatsappNumber: "1123456789" }),
      });

      await waitFor(() =>
        expect(screen.getByLabelText(/whatsapp/i)).toHaveValue("1123456789"),
      );
    });

    it("saves an edited WhatsApp number via PATCH", async () => {
      const { fetchMock } = renderView({
        "/api/clubs": makeClub({ whatsappNumber: "" }),
      });

      await waitFor(() =>
        expect(
          screen.getByDisplayValue("Club Padel Norte"),
        ).toBeInTheDocument(),
      );

      fireEvent.change(screen.getByLabelText(/whatsapp/i), {
        target: { value: "1123456789" },
      });

      screen.getByRole("button", { name: /save changes/i }).click();

      await waitFor(() => {
        const patchCall = fetchMock.mock.calls.find(
          ([url, init]) => url === "/api/clubs" && init?.method === "PATCH",
        );
        expect(patchCall).toBeTruthy();
        const body = JSON.parse(
          (patchCall as [string, RequestInit])[1]!.body as string,
        );
        expect(body.whatsappNumber).toBe("1123456789");
      });
    });
  });
});

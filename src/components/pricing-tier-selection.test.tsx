import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PricingTierSelection } from "./pricing-tier-selection";

const mockPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

function cleanPhone(value: string): string {
  return value.replace(/[^\d+]/g, "").slice(0, 18);
}

describe("PricingTierSelection multi-provider flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("lets a member select a tier and choose between three payment providers", async () => {
    const user = userEvent.setup();
    render(<PricingTierSelection isAuthenticated userId="user-123" />);

    const cards = screen.getAllByTestId("tier-card");
    await user.click(cards[1]!.querySelector("button")!);

    expect(screen.getByTestId("payment-method-selector")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Virement bancaire/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Wave/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Orange Money/i })).toBeInTheDocument();
  });

  it("redirects to /pricing/virement when bank transfer is selected", async () => {
    const user = userEvent.setup();
    render(<PricingTierSelection isAuthenticated userId="user-123" />);

    const cards = screen.getAllByTestId("tier-card");
    await user.click(cards[2]!.querySelector("button")!);
    await user.click(screen.getByTestId("payment-method-submit"));

    expect(mockPush).toHaveBeenCalledWith("/pricing/virement?tier=BOSS&period=MONTHLY");
  });

  it("creates a Wave subscription and displays Wave instructions", async () => {
    const user = userEvent.setup();
    const phoneInput = "+225 01 23 45 67 89";
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            subscription: {
              id: "sub-wave",
              status: "TRIAL",
              tier: "GRAND_FRERE",
              provider: "WAVE",
              providerPhone: cleanPhone(phoneInput),
              providerRef: "IBC-user-123-GRAND_FRERE",
            },
            payment: { amount: 49, status: "pending" },
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );

    render(<PricingTierSelection isAuthenticated userId="user-123" />);

    const cards = screen.getAllByTestId("tier-card");
    await user.click(cards[1]!.querySelector("button")!);
    await user.click(screen.getByRole("radio", { name: /Wave/i }));
    await user.type(screen.getByTestId("provider-phone-input"), phoneInput);
    await user.click(screen.getByTestId("payment-method-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("wave-instructions")).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.stringContaining('"provider":"WAVE"'),
    });

    const callBody = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(callBody).toMatchObject({
      tier: "GRAND_FRERE",
      period: "MONTHLY",
      provider: "WAVE",
      providerPhone: cleanPhone(phoneInput),
    });
    expect(screen.getByTestId("wave-reference")).toHaveTextContent("IBC-user-123-GRAND_FRERE");
    expect(mockToastSuccess).toHaveBeenCalledWith("Abonnement créé. Effectue ton paiement pour finaliser.");
  });

  it("creates an Orange Money subscription and displays Orange Money instructions", async () => {
    const user = userEvent.setup();
    const phoneInput = "+221 77 123 45 67";
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            subscription: {
              id: "sub-orange",
              status: "TRIAL",
              tier: "AFFRANCHI",
              provider: "ORANGE_MONEY",
              providerPhone: cleanPhone(phoneInput),
              providerRef: "IBC-user-123-AFFRANCHI",
            },
            payment: { amount: 29, status: "pending" },
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );

    render(<PricingTierSelection isAuthenticated userId="user-123" />);

    const cards = screen.getAllByTestId("tier-card");
    await user.click(cards[0]!.querySelector("button")!);
    await user.click(screen.getByRole("radio", { name: /Orange Money/i }));
    await user.type(screen.getByTestId("provider-phone-input"), phoneInput);
    await user.click(screen.getByTestId("payment-method-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("orange-money-instructions")).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.stringContaining('"provider":"ORANGE_MONEY"'),
    });

    const callBody = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(callBody).toMatchObject({
      tier: "AFFRANCHI",
      period: "MONTHLY",
      provider: "ORANGE_MONEY",
      providerPhone: cleanPhone(phoneInput),
    });
    expect(screen.getByTestId("orange-money-reference")).toHaveTextContent("IBC-user-123-AFFRANCHI");
  });

  it("shows an error when the API rejects a mobile money request", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: "Données invalides" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    );

    render(<PricingTierSelection isAuthenticated userId="user-123" />);

    const cards = screen.getAllByTestId("tier-card");
    await user.click(cards[0]!.querySelector("button")!);
    await user.click(screen.getByRole("radio", { name: /Wave/i }));
    await user.type(screen.getByTestId("provider-phone-input"), "+225 01 23 45 67 89");
    await user.click(screen.getByTestId("payment-method-submit"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Données invalides");
    });
    expect(mockToastError).toHaveBeenCalledWith("Données invalides");
  });

  it("keeps public visitors on signup guidance without payment selector", () => {
    render(<PricingTierSelection isAuthenticated={false} />);

    expect(screen.queryByTestId("payment-method-selector")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/auth/signup");
  });

  it("allows going back from mobile money instructions to payment selection", async () => {
    const user = userEvent.setup();
    const phoneInput = "+225 01 23 45 67 89";
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            subscription: {
              id: "sub-wave",
              status: "TRIAL",
              tier: "GRAND_FRERE",
              provider: "WAVE",
              providerPhone: cleanPhone(phoneInput),
              providerRef: "IBC-user-123-GRAND_FRERE",
            },
            payment: { amount: 49, status: "pending" },
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );

    render(<PricingTierSelection isAuthenticated userId="user-123" />);

    const cards = screen.getAllByTestId("tier-card");
    await user.click(cards[1]!.querySelector("button")!);
    await user.click(screen.getByRole("radio", { name: /Wave/i }));
    await user.type(screen.getByTestId("provider-phone-input"), phoneInput);
    await user.click(screen.getByTestId("payment-method-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("wave-instructions")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("payment-back-button"));
    expect(screen.getByTestId("payment-method-selector")).toBeInTheDocument();
  });

  it("cancels tier selection when Annuler is clicked", async () => {
    const user = userEvent.setup();
    render(<PricingTierSelection isAuthenticated userId="user-123" />);

    const cards = screen.getAllByTestId("tier-card");
    await user.click(cards[0]!.querySelector("button")!);
    expect(screen.getByTestId("payment-method-selector")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Annuler/i }));
    expect(screen.queryByTestId("payment-method-selector")).not.toBeInTheDocument();
  });
});

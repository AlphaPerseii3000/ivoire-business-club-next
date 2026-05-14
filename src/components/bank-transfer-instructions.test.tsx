import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BankTransferInstructions } from "./bank-transfer-instructions";

const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockClipboardWriteText = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

const defaultProps = {
  tier: "GRAND_FRERE" as const,
  beneficiary: "KS Investment",
  iban: "FR76 3000 6000 0112 3456 7890 189",
  bic: "AGRIFRPP",
  bankAddress: "1 avenue de la Banque, Abidjan",
  currency: "EUR",
  amount: 49,
  reference: "IBC-user-123-GRAND_FRERE",
};

describe("BankTransferInstructions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClipboardWriteText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: mockClipboardWriteText,
      },
    });
    global.fetch = vi.fn();
  });

  it("renders complete KS Investment bank-transfer details and copy actions", async () => {
    render(<BankTransferInstructions {...defaultProps} />);

    expect(screen.getByText("KS Investment")).toBeInTheDocument();
    expect(screen.getByText(defaultProps.iban)).toBeInTheDocument();
    expect(screen.getByText("49 EUR")).toBeInTheDocument();
    expect(screen.getByText("IBC-user-123-GRAND_FRERE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copier$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copier tout" })).toBeInTheDocument();
    expect(screen.getByText("Combien de temps pour la validation ?")).toBeInTheDocument();
    expect(screen.getByText("Sous 24h ouvrées")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Copier$/ }));
    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith(defaultProps.iban);
    });

    fireEvent.click(screen.getByRole("button", { name: "Copier tout" }));
    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenLastCalledWith(
        expect.stringContaining("Bénéficiaire : KS Investment")
      );
    });
    expect(mockClipboardWriteText).toHaveBeenLastCalledWith(
      expect.stringContaining("Référence : IBC-user-123-GRAND_FRERE")
    );
  });

  it("confirms transfer, shows exact toast copy, and renders pending tracker", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            subscription: {
              id: "sub-1",
              status: "TRIAL",
              tier: "GRAND_FRERE",
              provider: "BANK_TRANSFER",
              providerRef: "IBC-user-123-GRAND_FRERE",
            },
            payment: { amount: 49, status: "pending" },
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );

    render(<BankTransferInstructions {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: "J'ai effectué le virement" }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Merci ! Nous validons sous 24h.");
    });

    expect(fetch).toHaveBeenCalledWith("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "GRAND_FRERE", period: "MONTHLY" }),
    });
    expect(screen.getByTestId("transfer-confirmation")).toBeInTheDocument();
    expect(screen.getByText("Essai")).toBeInTheDocument();
    expect(screen.getByText("En attente")).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByText("Paiement par virement en cours")).toBeInTheDocument();
  });
});

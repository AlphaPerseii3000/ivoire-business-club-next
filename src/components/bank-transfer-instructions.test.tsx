import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BankTransferInstructions } from "./bank-transfer-instructions";
import { getBankTransferDetails } from "@/lib/bank-transfer-config";

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

  it("renders complete bank-transfer details and allows toggling between EUR and XOF using fallback props", async () => {
    render(<BankTransferInstructions {...defaultProps} />);

    // 1. Verify default view (EUR) using fallbacks
    expect(screen.getByText("KS Investment")).toBeInTheDocument();
    expect(screen.getByText("49 EUR")).toBeInTheDocument();
    expect(screen.getByText(defaultProps.iban)).toBeInTheDocument();
    expect(screen.getByText("SOCIETE GENERALE - PARIS")).toBeInTheDocument();
    expect(screen.getByText("1 avenue de la Banque, Abidjan")).toBeInTheDocument();
    expect(screen.getByText("IBC-user-123-GRAND_FRERE")).toBeInTheDocument();

    // Verify copy button for final IBAN in EUR tab
    const copyIbanBtn = screen.getByRole("button", { name: "Copier IBAN" });
    expect(copyIbanBtn).toBeInTheDocument();
    fireEvent.click(copyIbanBtn);
    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith(defaultProps.iban);
    });

    // Verify copy all button in EUR tab
    const copyAllEurBtn = screen.getByRole("button", { name: "Copier toutes les informations EUR" });
    expect(copyAllEurBtn).toBeInTheDocument();
    fireEvent.click(copyAllEurBtn);
    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenLastCalledWith(
        expect.stringContaining("Banque Domiciliation : SOCIETE GENERALE - PARIS")
      );
    });
    expect(mockClipboardWriteText).toHaveBeenLastCalledWith(
      expect.stringContaining("Bénéficiaire Final : KS Investment")
    );

    // 2. Switch to XOF tab
    const xofTabTrigger = screen.getByRole("tab", { name: /Virement en XOF/ });
    expect(xofTabTrigger).toBeInTheDocument();
    fireEvent.click(xofTabTrigger);

    // Verify XOF view content
    expect(screen.getByText("32 000 XOF")).toBeInTheDocument(); // 49 EUR rounded is 32000
    expect(screen.getByText("Montant exact converti (1€ = 655,957 XOF) : 32 142 XOF")).toBeInTheDocument();
    expect(screen.getByText("VERSUS BANK (01005-AGENCE ANGRE)")).toBeInTheDocument();

    // Verify copy all button in XOF tab
    const copyAllXofBtn = screen.getByRole("button", { name: "Copier toutes les informations XOF" });
    expect(copyAllXofBtn).toBeInTheDocument();
    fireEvent.click(copyAllXofBtn);
    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenLastCalledWith(
        expect.stringContaining("Banque : VERSUS BANK (01005-AGENCE ANGRE)")
      );
    });
    expect(mockClipboardWriteText).toHaveBeenLastCalledWith(
      expect.stringMatching(/Montant Suggéré : 32\s000 XOF/)
    );
  });

  it("renders with real production coordinates and verifies EUR and XOF values", async () => {
    const details = getBankTransferDetails();

    render(
      <BankTransferInstructions
        {...defaultProps}
        xofDetails={details.xof}
        eurDetails={details.eur}
      />
    );

    // Verify EUR view uses real Société Générale details
    expect(screen.getByText("SOCIETE GENERALE - PARIS")).toBeInTheDocument();
    expect(screen.getByText("17 Cours Valmy Tour Granite 92800 Paris La Défense 7 France")).toBeInTheDocument();
    expect(screen.getAllByText("SOGEFRPPXXX")[0]).toBeInTheDocument();

    // Switch to XOF tab
    const xofTabTrigger = screen.getByRole("tab", { name: /Virement en XOF/ });
    fireEvent.click(xofTabTrigger);

    // Verify XOF view uses real Versus Bank details
    expect(screen.getByText("VERSUS BANK (01005-AGENCE ANGRE)")).toBeInTheDocument();
    expect(screen.getByText("01 BP 1874 ABIDJAN 01, COTE D'IVOIRE")).toBeInTheDocument();
    expect(screen.getAllByText("VSBKCIABXXX")[0]).toBeInTheDocument();
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



import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BankTransferInstructions } from "./bank-transfer-instructions";
import { getBankTransferDetails } from "@/lib/bank-transfer-config";

const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastWarning = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockClipboardWriteText = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
toast: {
  success: mockToastSuccess,
  warning: mockToastWarning,
  error: mockToastError,
},
}));

const defaultProps = {
  tier: "GRAND_FRERE" as const,
  period: "MONTHLY" as const,
  beneficiary: "KS Investment",
  iban: "FR76 3000 6000 0112 3456 7890 189",
  bic: "AGRIFRPP",
  bankAddress: "1 avenue de la Banque, Abidjan",
  currency: "EUR",
  amount: 59,
  reference: "IBC-user-123-GRAND_FRERE",
};

const defaultPropsPeriodMonthly = {
  ...defaultProps,
  period: "MONTHLY" as const,
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

  function createFile(name: string, type: string, size = 1024): File {
    return new File([new Uint8Array(size).fill(1)], name, { type });
  }

  it("renders complete bank-transfer details and allows toggling between EUR and XOF using fallback props", async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(<BankTransferInstructions {...defaultPropsPeriodMonthly} />);

    // 1. Verify default view (EUR) using fallbacks
    expect(screen.getByText("KS Investment")).toBeInTheDocument();
    expect(screen.getByText("59 EUR")).toBeInTheDocument();
    expect(screen.getByText(defaultProps.iban)).toBeInTheDocument();
    expect(screen.getByText("SOCIETE GENERALE - PARIS")).toBeInTheDocument();
    expect(screen.getByText("1 avenue de la Banque, Abidjan")).toBeInTheDocument();
    expect(screen.getByText("IBC-user-123-GRAND_FRERE")).toBeInTheDocument();

    // Verify copy button for transit IBAN in EUR tab
    const copyTransitIbanBtn = screen.getByRole("button", { name: "Copier IBAN Transit" });
    expect(copyTransitIbanBtn).toBeInTheDocument();
    await user.click(copyTransitIbanBtn);
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith(defaultProps.iban);
    });

    // Verify copy button for final IBAN in EUR tab
    const copyFinalIbanBtn = screen.getByRole("button", { name: "Copier IBAN Final" });
    expect(copyFinalIbanBtn).toBeInTheDocument();
    await user.click(copyFinalIbanBtn);
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith("CI93 CI11 2010 0501 8780 4900 0125");
    });

    // Verify copy all button in EUR tab
    const copyAllEurBtn = screen.getByRole("button", { name: "Copier toutes les informations EUR" });
    expect(copyAllEurBtn).toBeInTheDocument();
    await user.click(copyAllEurBtn);
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenLastCalledWith(
        expect.stringContaining("Banque Domiciliation : SOCIETE GENERALE - PARIS")
      );
    });
    expect(writeTextSpy).toHaveBeenLastCalledWith(
      expect.stringContaining("Bénéficiaire Final : KS Investment")
    );

    // 2. Switch to XOF tab
    const xofTabTrigger = screen.getByRole("tab", { name: /Virement en XOF/ });
    expect(xofTabTrigger).toBeInTheDocument();
    await user.click(xofTabTrigger);

    // Verify XOF view content
    expect(screen.getByText("39 000 XOF")).toBeInTheDocument(); // 59 EUR rounded is 39000
    expect(screen.getByText("Montant exact converti (1€ = 655,957 XOF) : 38 701 XOF")).toBeInTheDocument();
    expect(screen.getByText("VERSUS BANK (01005-AGENCE ANGRE)")).toBeInTheDocument();

    // Verify copy all button in XOF tab
    const copyAllXofBtn = screen.getByRole("button", { name: "Copier toutes les informations XOF" });
    expect(copyAllXofBtn).toBeInTheDocument();
    await user.click(copyAllXofBtn);
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenLastCalledWith(
        expect.stringContaining("Banque : VERSUS BANK (01005-AGENCE ANGRE)")
      );
    });
    expect(writeTextSpy).toHaveBeenLastCalledWith(
      expect.stringMatching(/Montant Suggéré : 39\s000 XOF/)
    );
  });

  it("renders with real production coordinates and verifies EUR and XOF values", async () => {
    const user = userEvent.setup();
    const details = getBankTransferDetails();

    render(
      <BankTransferInstructions
        {...defaultPropsPeriodMonthly}
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
    await user.click(xofTabTrigger);

    // Verify XOF view uses real Versus Bank details
    expect(screen.getByText("VERSUS BANK (01005-AGENCE ANGRE)")).toBeInTheDocument();
    expect(screen.getByText("01 BP 1874 ABIDJAN 01, COTE D'IVOIRE")).toBeInTheDocument();
    expect(screen.getAllByText("VSBKCIABXXX")[0]).toBeInTheDocument();
  });

  it("confirms transfer, shows exact toast copy, and renders pending tracker", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(
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
              payment: { amount: 59, status: "pending" },
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              subscriptionId: "sub-1",
              paymentReceiptUrl: "https://cdn.example.com/sub-1/receipt.pdf",
              paymentReceiptKey: "subscriptions/sub-1/receipts/uuid.pdf",
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      );

    render(<BankTransferInstructions {...defaultPropsPeriodMonthly} />);
    await user.click(screen.getByRole("button", { name: "J'ai effectué le virement" }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Merci ! Nous validons sous 24h.");
    });

    expect(fetch).toHaveBeenCalledWith("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "GRAND_FRERE", period: "MONTHLY" }),
    });

    const uploadCall = vi.mocked(fetch).mock.calls[1];
    expect(uploadCall).toBeUndefined();

    expect(screen.getByTestId("transfer-confirmation")).toBeInTheDocument();
    expect(screen.getByText("Essai")).toBeInTheDocument();
    expect(screen.getByText("En attente")).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByText("Paiement par virement en cours")).toBeInTheDocument();
  });

  it("uploads a selected receipt file after confirming the transfer", async () => {
    const user = userEvent.setup();
    const receiptFile = createFile("receipt.pdf", "application/pdf");

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              subscription: { id: "sub-with-receipt", status: "PENDING" },
              payment: { amount: 59, status: "pending" },
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              subscriptionId: "sub-with-receipt",
              paymentReceiptUrl: "https://cdn.example.com/sub-with-receipt/receipt.pdf",
              paymentReceiptKey: "subscriptions/sub-with-receipt/receipts/uuid.pdf",
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      );

    render(<BankTransferInstructions {...defaultPropsPeriodMonthly} receiptFile={receiptFile} />);

    await user.click(screen.getByRole("button", { name: "J'ai effectué le virement" }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Merci ! Nous validons sous 24h.");
    });

    const uploadCall = vi.mocked(fetch).mock.calls[1];
    expect(uploadCall[0]).toBe("/api/subscriptions/upload-receipt");
    const body = uploadCall[1]?.body as FormData;
    expect(body.get("subscriptionId")).toBe("sub-with-receipt");
    expect(body.get("file")).toBe(receiptFile);
  });

  it("shows a warning toast when receipt upload fails but still confirms the subscription", async () => {
    const user = userEvent.setup();
    const receiptFile = createFile("receipt.pdf", "application/pdf");

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              subscription: { id: "sub-upload-fails", status: "PENDING" },
              payment: { amount: 59, status: "pending" },
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Fichier invalide" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      );

    render(<BankTransferInstructions {...defaultPropsPeriodMonthly} receiptFile={receiptFile} />);

    await user.click(screen.getByRole("button", { name: "J'ai effectué le virement" }));

    await waitFor(() => {
      expect(mockToastWarning).toHaveBeenCalledWith("Fichier invalide");
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Merci ! Nous validons sous 24h.");
    expect(screen.getByTestId("transfer-confirmation")).toBeInTheDocument();
  });
});



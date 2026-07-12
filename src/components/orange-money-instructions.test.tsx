import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrangeMoneyInstructions } from "./orange-money-instructions";

const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockClipboardWriteText = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

describe("OrangeMoneyInstructions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClipboardWriteText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: mockClipboardWriteText,
      },
    });
  });

  it("renders Orange Money instructions with USSD code, merchant number, amount and reference", () => {
    render(<OrangeMoneyInstructions tier="GRAND_FRERE" userId="user-123" amount={59} />);

    expect(screen.getByTestId("orange-money-instructions")).toBeInTheDocument();
    expect(screen.getByTestId("orange-money-ussd")).toBeInTheDocument();
    expect(screen.getByTestId("orange-money-merchant-number")).toBeInTheDocument();
    expect(screen.getByTestId("orange-money-amount")).toHaveTextContent("59,00 €");
    expect(screen.getByTestId("orange-money-reference")).toHaveTextContent("IBC-user-123-GRAND_FRERE");
    expect(screen.getByText(/Effectue ton paiement depuis l'application Orange Money ou le code USSD/i)).toBeInTheDocument();
  });

  it("copies the reference when copy button is clicked", async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(<OrangeMoneyInstructions tier="AFFRANCHI" userId="user-456" amount={29} />);

    const reference = "IBC-user-456-AFFRANCHI";
    await user.click(screen.getByRole("button", { name: /Copier la référence/i }));

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith(reference);
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Copié");
  });

  it("copies the USSD code when its copy button is clicked", async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(<OrangeMoneyInstructions tier="BOSS" userId="user-789" amount={129} />);

    await user.click(screen.getByRole("button", { name: /Copier le code/i }));

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalled();
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Copié");
  });
});

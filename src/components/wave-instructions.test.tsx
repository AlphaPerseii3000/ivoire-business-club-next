import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WaveInstructions } from "./wave-instructions";

const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockClipboardWriteText = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

describe("WaveInstructions", () => {
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

  it("renders Wave instructions with merchant number, amount and reference", () => {
    render(<WaveInstructions tier="GRAND_FRERE" userId="user-123" amount={59} />);

    expect(screen.getByTestId("wave-instructions")).toBeInTheDocument();
    expect(screen.getByTestId("wave-merchant-number")).toBeInTheDocument();
    expect(screen.getByTestId("wave-amount")).toHaveTextContent("59,00 €");
    expect(screen.getByTestId("wave-reference")).toHaveTextContent("IBC-user-123-GRAND_FRERE");
    expect(screen.getByText(/Effectue ton paiement depuis l'application Wave/i)).toBeInTheDocument();
  });

  it("copies the reference when copy button is clicked", async () => {
    render(<WaveInstructions tier="AFFRANCHI" userId="user-456" amount={29} />);

    const reference = "IBC-user-456-AFFRANCHI";
    fireEvent.click(screen.getByRole("button", { name: /Copier la référence/i }));

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith(reference);
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Copié");
  });

  it("copies the merchant number when its copy button is clicked", async () => {
    render(<WaveInstructions tier="BOSS" userId="user-789" amount={129} />);

    fireEvent.click(screen.getByRole("button", { name: /Copier le numéro/i }));

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalled();
    });
  });
});

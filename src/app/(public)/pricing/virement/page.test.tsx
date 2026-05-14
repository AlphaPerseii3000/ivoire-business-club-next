import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BankTransferPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("BankTransferPage", () => {
  it("uses the authenticated user id and selected tier to render the exact transfer reference", async () => {
    process.env.BANK_TRANSFER_IBAN = "FR76 3000 6000 0112 3456 7890 189";
    process.env.BANK_TRANSFER_BIC = "AGRIFRPP";
    process.env.BANK_TRANSFER_BANK_ADDRESS = "1 avenue de la Banque, Abidjan";
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } });

    render(await BankTransferPage({ searchParams: Promise.resolve({ tier: "BOSS" }) }));

    expect(screen.getByText("KS Investment")).toBeInTheDocument();
    expect(screen.getByText("99 EUR")).toBeInTheDocument();
    expect(screen.getByText("IBC-user-123-BOSS")).toBeInTheDocument();
    expect(screen.getByText("FR76 3000 6000 0112 3456 7890 189")).toBeInTheDocument();
  });
});

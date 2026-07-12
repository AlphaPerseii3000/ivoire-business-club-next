import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ResendVerificationButton from "./resend-verification-button";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ResendVerificationButton Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders with initial state", () => {
    render(<ResendVerificationButton />);
    expect(
      screen.getByRole("button", { name: "Renvoyer l'email de vérification" })
    ).toBeInTheDocument();
  });

  it("calls API on click and shows success message", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ResendVerificationButton />);
    const button = screen.getByRole("button", { name: "Renvoyer l'email de vérification" });

    await user.click(button);

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/send-verification", {
      method: "POST",
    });

    await waitFor(() => {
      expect(screen.getByText("Email de vérification envoyé avec succès !")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Email envoyé ✓" })).toBeDisabled();
    });
  });

  it("displays server error message on failure", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Trop de tentatives. Veuillez patienter." }),
    });

    render(<ResendVerificationButton />);
    const button = screen.getByRole("button", { name: "Renvoyer l'email de vérification" });

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Trop de tentatives. Veuillez patienter.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Renvoyer l'email de vérification" })).toBeEnabled();
    });
  });
});

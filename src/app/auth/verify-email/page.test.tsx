import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "./page";

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", mockFetch);

let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("shows error if token is missing in URL", async () => {
    mockSearchParams = new URLSearchParams(""); // no token

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText("Jeton de vérification manquant dans le lien.")).toBeInTheDocument();
      expect(screen.getByText("Échec de la vérification")).toBeInTheDocument();
    });
  });

  it("shows loading state and triggers fetch to verify endpoint", async () => {
    mockSearchParams = new URLSearchParams("token=good-token");
    // Hang fetch so it stays in loading state
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<VerifyEmailPage />);

    expect(screen.getByText("Vérification de votre compte en cours...")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/verify-email", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "good-token" }),
    }));
  });

  it("displays success message when verification API succeeds", async () => {
    mockSearchParams = new URLSearchParams("token=success-token");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText("Félicitations !")).toBeInTheDocument();
      expect(screen.getByText("Votre adresse email a été validée avec succès. Vous pouvez maintenant accéder à l'intégralité de votre espace membre.")).toBeInTheDocument();
      expect(screen.getByText("Accéder au tableau de bord")).toBeInTheDocument();
    });
  });

  it("displays error message when verification API fails", async () => {
    mockSearchParams = new URLSearchParams("token=fail-token");
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Le jeton a expiré" }),
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText("Le jeton a expiré")).toBeInTheDocument();
      expect(screen.getByText("Échec de la vérification")).toBeInTheDocument();
      expect(screen.getByText("Retourner aux paramètres")).toBeInTheDocument();
      expect(screen.getByText("Se connecter")).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "./page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

function mockFetch(status: number, body: Record<string, unknown>) {
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders the forgot password form", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("Mot de passe oublié")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ton@email.com")).toBeInTheDocument();
  });

  it("shows validation error for invalid email", async () => {
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByPlaceholderText("ton@email.com");
    fireEvent.change(emailInput, { target: { value: "bad-email" } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText("Email invalide")).toBeInTheDocument();
    });
  });

  it("displays generic success message after submission", async () => {
    global.fetch = mockFetch(200, { message: "Si un compte est associé à cet email, un lien de réinitialisation a été envoyé." });

    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByText("Envoyer le lien"));

    await waitFor(() => {
      expect(
        screen.getByTestId("success-message")
      ).toHaveTextContent("Si un compte est associé à cet email, un lien de réinitialisation a été envoyé.");
    });
  });

  it("displays error on server failure", async () => {
    global.fetch = mockFetch(500, { error: "Erreur interne" });

    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByText("Envoyer le lien"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-error")).toHaveTextContent("Erreur interne");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByPlaceholderText("ton@email.com");
    await user.type(emailInput, "bad-email");
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText("Email invalide")).toBeInTheDocument();
    });
  });

  it("displays generic success message after submission", async () => {
    const user = userEvent.setup();
    global.fetch = mockFetch(200, { message: "Si un compte est associé à cet email, un lien de réinitialisation a été envoyé." });

    render(<ForgotPasswordPage />);
    await user.type(screen.getByPlaceholderText("ton@email.com"), "test@example.com");
    await user.click(screen.getByText("Envoyer le lien"));

    await waitFor(() => {
      expect(
        screen.getByTestId("success-message")
      ).toHaveTextContent("Si un compte est associé à cet email, un lien de réinitialisation a été envoyé.");
    });
  });

  it("displays error on server failure", async () => {
    const user = userEvent.setup();
    global.fetch = mockFetch(500, { error: "Erreur interne" });

    render(<ForgotPasswordPage />);
    await user.type(screen.getByPlaceholderText("ton@email.com"), "test@example.com");
    await user.click(screen.getByText("Envoyer le lien"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-error")).toHaveTextContent("Erreur interne");
    });
  });
});

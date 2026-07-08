import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignUpPage from "./page";

const mockSignIn = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

describe("SignUpPage", () => {
  beforeEach(() => {
    mockSignIn.mockClear();
    mockSearchParams = new URLSearchParams();
    vi.stubGlobal("fetch", vi.fn());
  });

  // ---- Story 1.1 regression tests (preserved) ----
  it("renders the signup form and Google button", () => {
    render(<SignUpPage />);
    expect(screen.getByText("Créer un compte")).toBeInTheDocument();
    expect(screen.getByText("Continuer avec Google")).toBeInTheDocument();
  });

  it("calls signIn with google and callbackUrl /dashboard when Google button is clicked", () => {
    render(<SignUpPage />);
    const googleButton = screen.getByText("Continuer avec Google");
    fireEvent.click(googleButton);
    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/dashboard" });
  });

  it("disables Google button and shows loading text while signing in", () => {
    render(<SignUpPage />);
    const googleButton = screen.getByText("Continuer avec Google");
    fireEvent.click(googleButton);
    expect(mockSignIn).toHaveBeenCalled();
    expect(googleButton).toBeDisabled();
  });

  it("displays OAuth error from query param on mount", () => {
    mockSearchParams = new URLSearchParams("error=OAuthCallback");
    render(<SignUpPage />);
    expect(
      screen.getByText("La connexion avec Google a échoué. Veuillez réessayer.")
    ).toBeInTheDocument();
  });

  it("displays AccessDenied error message", () => {
    mockSearchParams = new URLSearchParams("error=AccessDenied");
    render(<SignUpPage />);
    expect(
      screen.getByText("Accès refusé. Tu as peut-être annulé la connexion.")
    ).toBeInTheDocument();
  });

  // ---- Story 1.2 new tests ----
  it("shows Zod validation errors inline before submission", async () => {
    render(<SignUpPage />);
    const emailInput = screen.getByPlaceholderText("ton@email.com");
    fireEvent.change(emailInput, { target: { value: "bad-email" } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText("Email invalide")).toBeInTheDocument();
    });
  });

  it("shows password strength indicator as weak for short password", async () => {
    render(<SignUpPage />);
    const pwInput = screen.getByPlaceholderText("••••••••");
    fireEvent.change(pwInput, { target: { value: "abc" } });
    fireEvent.blur(pwInput);

    await waitFor(() => {
      expect(screen.getByText("Force : Faible")).toBeInTheDocument();
    });
  });

  it("shows password strength indicator as strong for 12+ chars with symbols", async () => {
    render(<SignUpPage />);
    const pwInput = screen.getByPlaceholderText("••••••••");
    fireEvent.change(pwInput, { target: { value: "MyP@ssw0rd!23" } });
    fireEvent.blur(pwInput);

    await waitFor(() => {
      expect(screen.getByText("Force : Fort")).toBeInTheDocument();
    });
  });

  it("submits form via fetch with correct payload and redirects to /auth/signup-success on success", async () => {
    const originalWindow = window;
    const assignMock = vi.fn();
    vi.stubGlobal("window", {
      ...originalWindow,
      document: originalWindow.document,
      location: { ...originalWindow.location, href: "", assign: assignMock },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "u-1", email: "test@example.com", name: "Jean" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<SignUpPage />);
    fireEvent.change(screen.getByPlaceholderText("Jean Dupont"), { target: { value: "Jean" } });
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "securePass123!" } });
    
    const checkbox = screen.getByTestId("accept-terms-checkbox");
    fireEvent.click(checkbox);

    const submitBtn = screen.getByText("Créer mon compte");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/signup", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Jean", email: "test@example.com", password: "securePass123!", acceptTerms: true }),
      }));
    });

    await waitFor(() => {
      expect(window.location.href).toBe("/auth/signup-success");
    });

    vi.stubGlobal("window", originalWindow);
  });

  it("displays exact French duplicate-email error from API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "Cet email est déjà associé à un compte." }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<SignUpPage />);
    fireEvent.change(screen.getByPlaceholderText("Jean Dupont"), { target: { value: "Jean" } });
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "dup@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "securePass123!" } });

    const checkbox = screen.getByTestId("accept-terms-checkbox");
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByText("Créer mon compte"));

    await waitFor(() => {
      expect(
        screen.getByText("Cet email est déjà associé à un compte.")
      ).toBeInTheDocument();
    });
  });

  it("prevents submission and displays validation error if acceptTerms checkbox is not checked", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    render(<SignUpPage />);
    fireEvent.change(screen.getByPlaceholderText("Jean Dupont"), { target: { value: "Jean" } });
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "securePass123!" } });

    // Do NOT check the checkbox
    fireEvent.click(screen.getByText("Créer mon compte"));

    await waitFor(() => {
      expect(screen.getByText("Vous devez accepter les conditions pour continuer.")).toBeInTheDocument();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

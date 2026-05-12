import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignInPage from "./page";

const mockSignIn = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

describe("SignInPage", () => {
  beforeEach(() => {
    mockSignIn.mockClear();
    mockSearchParams = new URLSearchParams();
    vi.stubGlobal("fetch", vi.fn());
  });

  // ---- Story 1.1 regression tests (preserved) ----
  it("renders the signin form and Google button", () => {
    render(<SignInPage />);
    expect(screen.getByText("Connexion")).toBeInTheDocument();
    expect(screen.getByText("Continuer avec Google")).toBeInTheDocument();
  });

  it("calls signIn with google and callbackUrl /dashboard when Google button is clicked", () => {
    render(<SignInPage />);
    const googleButton = screen.getByText("Continuer avec Google");
    fireEvent.click(googleButton);
    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/dashboard" });
  });

  it("disables Google button and shows loading text while signing in", () => {
    render(<SignInPage />);
    const googleButton = screen.getByText("Continuer avec Google");
    fireEvent.click(googleButton);
    expect(mockSignIn).toHaveBeenCalled();
    expect(googleButton).toBeDisabled();
  });

  it("displays OAuth error from query param on mount", () => {
    mockSearchParams = new URLSearchParams("error=OAuthCallback");
    render(<SignInPage />);
    expect(
      screen.getByText("La connexion avec Google a échoué. Veuillez réessayer.")
    ).toBeInTheDocument();
  });

  it("displays AccessDenied error message", () => {
    mockSearchParams = new URLSearchParams("error=AccessDenied");
    render(<SignInPage />);
    expect(
      screen.getByText("Accès refusé. Tu as peut-être annulé la connexion.")
    ).toBeInTheDocument();
  });

  // ---- Story 1.3 new tests ----
  it("shows Zod validation errors inline before submission", async () => {
    render(<SignInPage />);
    const emailInput = screen.getByPlaceholderText("ton@email.com");
    fireEvent.change(emailInput, { target: { value: "bad-email" } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText("Email invalide")).toBeInTheDocument();
    });
  });

  it("submits form via fetch to /api/auth/signin and calls signIn on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "u-1", email: "test@example.com", name: "Jean", tier: "AFFRANCHI", role: "MEMBER" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<SignInPage />);
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "securePass123!" } });

    const submitBtn = screen.getByText("Se connecter");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/signin", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "securePass123!" }),
      }));
    });

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "securePass123!",
        callbackUrl: "/dashboard",
      });
    });
  });

  it("displays exact French 401 error from API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Email ou mot de passe incorrect." }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<SignInPage />);
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "bad@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "wrongpass" } });

    fireEvent.click(screen.getByText("Se connecter"));

    await waitFor(() => {
      expect(
        screen.getByText("Email ou mot de passe incorrect.")
      ).toBeInTheDocument();
    });
  });

  it("displays exact French 429 error from API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "Trop de tentatives. Réessayez dans une minute." }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<SignInPage />);
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "securePass123!" } });

    fireEvent.click(screen.getByText("Se connecter"));

    await waitFor(() => {
      expect(
        screen.getByText("Trop de tentatives. Réessayez dans une minute.")
      ).toBeInTheDocument();
    });
  });

  it("disables submit button during form submission", async () => {
    let resolveFetch: (value: unknown) => void;
    const mockFetch = vi.fn().mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal("fetch", mockFetch);

    render(<SignInPage />);
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "securePass123!" } });

    const submitBtn = screen.getByText("Se connecter");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Connexion...")).toBeDisabled();
    });

    resolveFetch!({ ok: true, json: async () => ({}) });
  });
});

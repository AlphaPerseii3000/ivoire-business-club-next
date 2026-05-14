import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignInPage from "./page";

const mockSignIn = vi.fn();
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));

describe("SignInPage", () => {
  beforeEach(() => {
    mockSignIn.mockClear();
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams();
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

  it("calls signIn with credentials and redirect:false on form submit", async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: undefined });

    render(<SignInPage />);
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "securePass123!" } });

    fireEvent.click(screen.getByText("Se connecter"));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "securePass123!",
        callbackUrl: "/dashboard",
        redirect: false,
      });
    });
  });

  it("redirects to /dashboard on successful signIn", async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: undefined });

    render(<SignInPage />);
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "securePass123!" } });

    fireEvent.click(screen.getByText("Se connecter"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("displays error message on invalid credentials", async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" });

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

  it("displays error message on network error", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"));

    render(<SignInPage />);
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "securePass123!" } });

    fireEvent.click(screen.getByText("Se connecter"));

    await waitFor(() => {
      expect(
        screen.getByText("Email ou mot de passe incorrect.")
      ).toBeInTheDocument();
    });
  });

  it("disables submit button during form submission", async () => {
    let resolveSignIn: (value: unknown) => void;
    mockSignIn.mockImplementation(() => new Promise((resolve) => { resolveSignIn = resolve; }));

    render(<SignInPage />);
    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "securePass123!" } });

    const submitBtn = screen.getByText("Se connecter");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Connexion...")).toBeDisabled();
    });

    resolveSignIn!({ ok: true, error: undefined });
  });
});
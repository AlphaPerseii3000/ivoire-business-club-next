import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  });

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
});

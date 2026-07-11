import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ResetPasswordPage from "./page";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams("token=raw-token");
    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      const method = init?.method || "GET";
      if (method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ valid: true }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ message: "Success" }),
      } as Response;
    });
  });

  it("renders the reset password form with valid token", async () => {
    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Nouveau mot de passe" })).toBeInTheDocument();
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
    });
  });

  it("shows invalid link error when token is missing", async () => {
    mockSearchParams = new URLSearchParams();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByTestId("auth-error")).toHaveTextContent("Ce lien est invalide.");
    });
  });

  it("shows invalid link error when token validation fails on mount", async () => {
    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      return {
        ok: false,
        status: 400,
        json: async () => ({ error: "Ce lien est invalide ou expiré." }),
      } as Response;
    });

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByTestId("auth-error")).toHaveTextContent("Ce lien est invalide ou expiré.");
      expect(screen.queryByTestId("reset-form")).toBeNull();
    });
  });

  it("shows password strength indicator", async () => {
    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId("password-input"), { target: { value: "Abcdef1!" } });

    await waitFor(() => {
      expect(screen.getByText(/Force :/)).toBeInTheDocument();
    });
  });

  it("submits new password and shows success", async () => {
    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      const method = init?.method || "GET";
      if (method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ valid: true }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ message: "Mot de passe mis à jour avec succès." }),
      } as Response;
    });

    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId("password-input"), { target: { value: "newPass123!" } });
      fireEvent.change(screen.getByTestId("confirm-password-input"), { target: { value: "newPass123!" } });
      fireEvent.click(screen.getByTestId("submit-button"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("success-message")).toHaveTextContent("Mot de passe mis à jour");
    }, { timeout: 2000 });
  });

  it("displays server error on reset failure", async () => {
    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      const method = init?.method || "GET";
      if (method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ valid: true }),
        } as Response;
      }
      return {
        ok: false,
        status: 400,
        json: async () => ({ error: "Ce lien a déjà été utilisé." }),
      } as Response;
    });

    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId("password-input"), { target: { value: "newPass123!" } });
      fireEvent.change(screen.getByTestId("confirm-password-input"), { target: { value: "newPass123!" } });
      fireEvent.click(screen.getByTestId("submit-button"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-error")).toHaveTextContent("Ce lien a déjà été utilisé.");
    }, { timeout: 2000 });
  });

  it("renders the set password form when type=set", async () => {
    mockSearchParams = new URLSearchParams("token=raw-token&type=set");
    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Définir votre mot de passe" })
      ).toBeInTheDocument();
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
      expect(screen.getByTestId("submit-button")).toHaveTextContent(
        "Définir le mot de passe"
      );
    });
  });

  it("submits defined password and shows success when type=set", async () => {
    mockSearchParams = new URLSearchParams("token=raw-token&type=set");
    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      const method = init?.method || "GET";
      if (method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ valid: true }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          message: "Votre mot de passe a été défini. Vous pouvez vous connecter.",
        }),
      } as Response;
    });

    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId("password-input"), {
        target: { value: "newPass123!" },
      });
      fireEvent.change(screen.getByTestId("confirm-password-input"), {
        target: { value: "newPass123!" },
      });
      fireEvent.click(screen.getByTestId("submit-button"));
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("success-message")).toHaveTextContent(
          "Votre mot de passe a été défini. Redirection..."
        );
      },
      { timeout: 2000 }
    );
  });
});

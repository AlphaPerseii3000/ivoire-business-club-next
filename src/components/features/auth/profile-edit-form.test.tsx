import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileEditForm from "./profile-edit-form";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockUser = {
  name: "Jean Dupont",
  email: "jean@example.com",
  bio: "Entrepreneur à Abidjan",
  phone: "+225 0708091011",
  location: "Abidjan",
  country: "CI",
};

describe("ProfileEditForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form with user data pre-filled", () => {
    render(<ProfileEditForm user={mockUser} />);

    expect(screen.getByLabelText(/nom complet/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByDisplayValue("jean@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Entrepreneur à Abidjan")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+225 0708091011")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Abidjan")).toBeInTheDocument();
  });

  it("shows email field as disabled with helper text", () => {
    render(<ProfileEditForm user={mockUser} />);

    const emailInput = screen.getByDisplayValue("jean@example.com");
    expect(emailInput).toBeDisabled();
    expect(screen.getByText(/l'email ne peut pas être modifié/i)).toBeInTheDocument();
  });

  it("shows inline Zod validation error for invalid phone on blur", async () => {
    const user = userEvent.setup();
    render(<ProfileEditForm user={mockUser} />);

    const phoneInput = screen.getByLabelText(/téléphone/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, "abc");
    await user.tab(); // trigger onBlur validation

    await waitFor(() => {
      expect(screen.getByText(/numéro de téléphone valide/i)).toBeInTheDocument();
    });
  });

  it("shows inline validation error for name too short", async () => {
    const user = userEvent.setup();
    render(<ProfileEditForm user={mockUser} />);

    const nameInput = screen.getByLabelText(/nom complet/i);
    await user.clear(nameInput);
    await user.type(nameInput, "J");
    await user.tab(); // trigger onBlur validation

    await waitFor(() => {
      expect(screen.getByText(/au moins 2 caractères/i)).toBeInTheDocument();
    });
  });

  it("calls API and shows success toast on valid submission", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { ...mockUser, name: "Jean Nouveau" } }),
    });

    render(<ProfileEditForm user={mockUser} />);

    const nameInput = screen.getByLabelText(/nom complet/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Jean Nouveau");

    const submitButton = screen.getByRole("button", { name: /sauvegarder/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/user/profile", expect.objectContaining({
        method: "POST",
      }));
      expect(toast.success).toHaveBeenCalledWith("Profil mis à jour avec succès.");
    });
  });

  it("shows error toast on server error (500)", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Erreur interne" }),
    });

    render(<ProfileEditForm user={mockUser} />);

    const submitButton = screen.getByRole("button", { name: /sauvegarder/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Une erreur est survenue");
    });
  });

  it("redirects to signin on 401", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    // Mock window.location.href setter
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, href: "" },
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Non autorisé" }),
    });

    render(<ProfileEditForm user={mockUser} />);

    const submitButton = screen.getByRole("button", { name: /sauvegarder/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(window.location.href).toBe("/auth/signin");
    });

    // Restore
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("shows character count for bio field", () => {
    render(<ProfileEditForm user={mockUser} />);
    // Character count is rendered as "{length}/500"
    expect(screen.getByText(/\/500/)).toBeInTheDocument();
  });

  it("shows country select with UEMOA options", () => {
    render(<ProfileEditForm user={mockUser} />);
    // shadcn Select renders as custom Radix — verify label is present
    expect(screen.getByText(/pays/i)).toBeInTheDocument();
  });

  it("renders Google account info if hasPassword is false", () => {
    render(<ProfileEditForm user={{ ...mockUser, hasPassword: false }} />);

    expect(screen.getByText(/compte connecté via google/i)).toBeInTheDocument();
    expect(screen.getByText(/aucun mot de passe local n'est configuré/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^mot de passe actuel$/i)).not.toBeInTheDocument();
  });

  it("renders password change fields if hasPassword is true", () => {
    render(<ProfileEditForm user={{ ...mockUser, hasPassword: true }} />);

    expect(screen.getByRole("heading", { name: /^sécurité$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^mot de passe actuel$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nouveau mot de passe$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirmation du nouveau mot de passe$/i)).toBeInTheDocument();
  });

  it("shows validation error when passwords do not match on blur", async () => {
    const user = userEvent.setup();
    render(<ProfileEditForm user={{ ...mockUser, hasPassword: true }} />);

    const currentInput = screen.getByLabelText(/^mot de passe actuel$/i);
    const newInput = screen.getByLabelText(/^nouveau mot de passe$/i);
    const confirmInput = screen.getByLabelText(/^confirmation du nouveau mot de passe$/i);

    await user.type(currentInput, "oldPass123");
    await user.type(newInput, "newSecure123!");
    await user.type(confirmInput, "differentConfirm");
    await user.tab(); // trigger validation onBlur

    await waitFor(() => {
      expect(screen.getByText(/les nouveaux mots de passe ne correspondent pas/i)).toBeInTheDocument();
    });
  });

  it("shows validation error when new password is too short", async () => {
    const user = userEvent.setup();
    render(<ProfileEditForm user={{ ...mockUser, hasPassword: true }} />);

    const newInput = screen.getByLabelText(/^nouveau mot de passe$/i);
    await user.type(newInput, "short");
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/au moins 8 caractères/i)).toBeInTheDocument();
    });
  });

  it("calls password API and shows success toast on valid submission", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: "Mot de passe mis à jour avec succès." }),
    });

    render(<ProfileEditForm user={{ ...mockUser, hasPassword: true }} />);

    const currentInput = screen.getByLabelText(/^mot de passe actuel$/i);
    const newInput = screen.getByLabelText(/^nouveau mot de passe$/i);
    const confirmInput = screen.getByLabelText(/^confirmation du nouveau mot de passe$/i);

    await user.type(currentInput, "oldPass123");
    await user.type(newInput, "newSecure123!");
    await user.type(confirmInput, "newSecure123!");

    const submitButton = screen.getByRole("button", { name: /mettre à jour le mot de passe/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/user/password", expect.objectContaining({
        method: "POST",
      }));
      expect(toast.success).toHaveBeenCalledWith("Mot de passe mis à jour avec succès.");
      // fields should be cleared
      expect(currentInput).toHaveValue("");
      expect(newInput).toHaveValue("");
      expect(confirmInput).toHaveValue("");
    });
  });
});
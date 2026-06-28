import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompleteProfileForm from "./complete-profile-form";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const defaultValues = {
  fullName: "Jean Dupont",
  address: "12 rue des Affranchis",
  phone: "+225 0708091011",
  country: "CI",
  email: "jean@example.com",
  duration: "MONTHLY",
  tier: "BOSS",
  activity: "Consultant",
  goals: "Trouver des opportunités en Côte d'Ivoire.",
  needs: "Réseau et deals vérifiés.",
};

function renderForm(values = defaultValues) {
  return render(<CompleteProfileForm defaultValues={values} />);
}

describe("CompleteProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("pré-remplit les champs avec les valeurs par défaut", () => {
    renderForm();

    expect(screen.getByLabelText(/Nom/)).toHaveValue("Jean Dupont");
    expect(screen.getByLabelText(/Adresse/)).toHaveValue("12 rue des Affranchis");
    expect(screen.getByLabelText(/Téléphone/)).toHaveValue("+225 0708091011");
    expect(screen.getByTestId("country-trigger")).toHaveTextContent("CI");
    expect(screen.getByLabelText(/Email/)).toHaveValue("jean@example.com");
    expect(screen.getByLabelText(/Email/)).toBeDisabled();
  });

  it("affiche le champ Pays (Select) entre Téléphone et Durée d'adhésion", () => {
    renderForm();

    const phoneInput = screen.getByLabelText(/Téléphone/);
    const countryTrigger = screen.getByTestId("country-trigger");
    const durationTrigger = screen.getByTestId("duration-trigger");

    // Vérifie l'ordre d'apparition dans le DOM
    expect(phoneInput.compareDocumentPosition(countryTrigger)).toBe(4);
    expect(countryTrigger.compareDocumentPosition(durationTrigger)).toBe(4);
  });

  it("appelle l'API avec les données du formulaire à la soumission", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          onboardingForm: {
            ...defaultValues,
            country: "CI",
          },
          onboardingCompletedAt: new Date().toISOString(),
        },
      }),
    });

    renderForm();
    const submitButton = screen.getByTestId("submit-button");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/user/onboarding",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        })
      );
    });

    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.fullName).toBe("Jean Dupont");
    expect(body.email).toBe("jean@example.com");
    expect(body.country).toBe("CI");
  });

  it("affiche un toast de succès et redirige vers /dashboard", async () => {
    const { toast } = await import("sonner");
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          onboardingForm: {
            ...defaultValues,
            country: "CI",
          },
          onboardingCompletedAt: new Date().toISOString(),
        },
      }),
    });

    renderForm();
    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Profil complété. Bienvenue sur IBC !");
    });
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("affiche un toast d'erreur si l'API retourne une erreur", async () => {
    const { toast } = await import("sonner");
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Erreur interne" }),
    });

    renderForm();
    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erreur lors de la sauvegarde");
    });
  });

  it("redirige vers /auth/signin si l'API retourne 401", async () => {
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "http://localhost:3000/", assign: assignMock },
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Non autorisé" }),
    });

    renderForm();
    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(window.location.href).toBe("/auth/signin");
    });
  });

  it("permet de modifier un champ texte", async () => {
    renderForm();
    const fullNameInput = screen.getByLabelText(/Nom/);
    await userEvent.clear(fullNameInput);
    await userEvent.type(fullNameInput, "Marie Dubois");

    expect(fullNameInput).toHaveValue("Marie Dubois");
  });

  it("pré-remplit le pays avec la valeur par défaut", () => {
    const customValues = { ...defaultValues, country: "FR" };
    renderForm(customValues);

    expect(screen.getByTestId("country-trigger")).toHaveTextContent("FR");
  });
});

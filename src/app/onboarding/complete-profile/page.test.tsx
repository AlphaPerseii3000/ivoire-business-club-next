import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CompleteProfilePage from "./page";

const mockAuth = vi.hoisted(() => vi.fn(() => Promise.resolve({ user: { id: "user-123" } } as unknown)));
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/features/onboarding/complete-profile-form", () => ({
  default: ({ defaultValues }: { defaultValues: Record<string, string> }) => (
    <div data-testid="complete-profile-form" data-props={JSON.stringify(defaultValues)}>Formulaire</div>
  ),
}));

describe("CompleteProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige vers /auth/signin si non authentifié", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: null } } as unknown);

    await CompleteProfilePage();

    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("rend le formulaire avec les valeurs du profil si authentifié", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } } as unknown);
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      name: "Jean Dupont",
      email: "jean@example.com",
      phone: "+225 0708091011",
      country: "CI",
      onboardingForm: null,
      onboardingCompletedAt: null,
    });

    const ui = await CompleteProfilePage();
    render(ui);

    expect(screen.getByTestId("complete-profile-form")).toBeInTheDocument();
    const formProps = JSON.parse(screen.getByTestId("complete-profile-form").getAttribute("data-props") ?? "{}");
    expect(formProps.fullName).toBe("Jean Dupont");
    expect(formProps.email).toBe("jean@example.com");
    expect(formProps.phone).toBe("+225 0708091011");
  });

  it("pré-remplit avec les données onboarding existantes", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-123" } } as unknown);
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      name: "Jean",
      email: "jean@example.com",
      phone: "+225 0000000000",
      country: "CI",
      onboardingForm: {
        fullName: "Jean Dupont",
        address: "12 rue des Affranchis",
        phone: "+225 0708091011",
        email: "jean@example.com",
        duration: "ANNUAL",
        tier: "BOSS",
        activity: "Consultant",
        goals: "Objectifs",
        needs: "Besoins",
      },
      onboardingCompletedAt: new Date("2026-06-18T10:00:00.000Z"),
    });

    const ui = await CompleteProfilePage();
    render(ui);

    const formProps = JSON.parse(screen.getByTestId("complete-profile-form").getAttribute("data-props") ?? "{}");
    expect(formProps.fullName).toBe("Jean Dupont");
    expect(formProps.address).toBe("12 rue des Affranchis");
    expect(formProps.duration).toBe("ANNUAL");
    expect(formProps.tier).toBe("BOSS");
  });
});

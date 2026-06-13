import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./dev.db";
});

import SettingsPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
vi.mock("@/components/features/auth/delete-account-dialog", () => ({
  default: () => <div data-testid="delete-account-dialog" />,
}));
vi.mock("@/components/features/auth/resend-verification-button", () => ({
  default: () => <div data-testid="resend-verification-button" />,
}));

const baseUser = {
  id: "user-123",
  name: "Jean Traoré",
  email: "jean@example.com",
  bio: "Une bio",
  location: "Abidjan",
  country: "CI",
  tier: "AFFRANCHI",
  role: "MEMBER",
  status: "ACTIVE",
  emailVerified: true,
  verificationStatus: "VERIFIED",
  subscriptions: [
    {
      id: "sub-1",
      tier: "AFFRANCHI",
      status: "ACTIVE",
      endDate: new Date("2026-12-31T00:00:00.000Z"),
      provider: "BANK_TRANSFER",
    },
  ],
};

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
  });

  it("redirects to sign-in if unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(SettingsPage()).rejects.toThrow("redirect:/auth/signin");
  });

  it("renders verified status correctly", async () => {
    mockUserFindUnique.mockResolvedValue(baseUser);

    render(await SettingsPage());

    expect(screen.getByText("✅ Membre vérifié")).toBeInTheDocument();
    expect(screen.queryByTestId("resend-verification-button")).not.toBeInTheDocument();
  });

  it("renders pending verification and missing prerequisites when user has missing fields", async () => {
    mockUserFindUnique.mockResolvedValue({
      ...baseUser,
      verificationStatus: "PENDING",
      emailVerified: false,
      bio: null, // missing bio
    });

    render(await SettingsPage());

    expect(screen.getByText("⏳ En attente de vérification")).toBeInTheDocument();
    // Verify missing prereq list contains Email non vérifié and Bio manquante
    expect(screen.getByText("Email non vérifié")).toBeInTheDocument();
    expect(screen.getByText("Bio manquante")).toBeInTheDocument();
    expect(screen.getByTestId("resend-verification-button")).toBeInTheDocument();
  });

  it("renders verification in progress", async () => {
    mockUserFindUnique.mockResolvedValue({
      ...baseUser,
      verificationStatus: "EN_COURS",
    });

    render(await SettingsPage());

    expect(
      screen.getByText("🔄 Vérification en cours — un administrateur validera bientôt ton profil")
    ).toBeInTheDocument();
  });

  it("renders rejected verification", async () => {
    mockUserFindUnique.mockResolvedValue({
      ...baseUser,
      verificationStatus: "REJECTED",
    });

    render(await SettingsPage());

    expect(screen.getByText("❌ Vérification rejetée")).toBeInTheDocument();
  });
});

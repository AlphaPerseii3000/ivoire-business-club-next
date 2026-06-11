import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfilePage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
  },
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
vi.mock("@/components/features/auth/avatar-upload", () => ({ default: () => <div data-testid="avatar-upload" /> }));
vi.mock("@/components/features/auth/profile-edit-form", () => ({ default: () => <div data-testid="profile-edit-form" /> }));
vi.mock("@/components/subscription-activation-notice", () => ({
  SubscriptionActivationNotice: ({ tier }: { tier: string }) => <div>Activation {tier}</div>,
}));
vi.mock("@/components/auth/sign-out-button", () => ({ default: () => <button>Déconnexion</button> }));

const baseUser = {
  id: "user-1",
  name: "Awa Traoré",
  email: "awa@example.com",
  bio: null,
  image: null,
  phone: null,
  location: null,
  country: null,
  tier: "GRAND_FRERE",
  role: "MEMBER",
  verificationStatus: "PENDING",
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
};

describe("ProfilePage subscription status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-05-14T12:00:00.000Z"));
    process.env.SUPPORT_WHATSAPP_NUMBER = "2250700000000";
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("renders the latest pending subscription tracker and WhatsApp support CTA after 24h", async () => {
    mockUserFindUnique.mockResolvedValue({
      ...baseUser,
      subscriptions: [
        {
          id: "sub-1",
          tier: "GRAND_FRERE",
          status: "PENDING",
          providerRef: "IBC-user-1-GRAND_FRERE",
          createdAt: new Date("2026-05-13T08:00:00.000Z"),
          updatedAt: new Date("2026-05-13T08:00:00.000Z"),
          endDate: null,
        },
      ],
    });

    render(await ProfilePage());

    expect(screen.getByText("Virement en cours de validation")).toBeInTheDocument();
    expect(screen.getByText("En attente")).toBeInTheDocument();
    const supportLink = screen.getByRole("link", { name: "Contacter le support" });
    expect(supportLink).toHaveAttribute("target", "_blank");
    expect(supportLink).toHaveAttribute("href", expect.stringContaining("https://wa.me/2250700000000"));
    expect(supportLink).toHaveAttribute("href", expect.stringContaining("IBC-user-1-GRAND_FRERE"));
    expect(screen.getByTestId("profile-edit-form")).toBeInTheDocument();
  });

  it("does not show support CTA before the 24h threshold", async () => {
    mockUserFindUnique.mockResolvedValue({
      ...baseUser,
      subscriptions: [
        {
          id: "sub-2",
          tier: "AFFRANCHI",
          status: "PENDING",
          providerRef: "IBC-user-1-AFFRANCHI",
          createdAt: new Date("2026-05-14T00:00:00.000Z"),
          updatedAt: new Date("2026-05-14T00:00:00.000Z"),
          endDate: null,
        },
      ],
    });

    render(await ProfilePage());

    expect(screen.queryByRole("link", { name: "Contacter le support" })).not.toBeInTheDocument();
  });

  it("renders a pricing CTA when no subscription exists", async () => {
    mockUserFindUnique.mockResolvedValue({ ...baseUser, subscriptions: [] });

    render(await ProfilePage());

    expect(screen.getByText("Aucun abonnement pour le moment")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les offres" })).toHaveAttribute("href", "/pricing");
  });

  it("renders a sign-out button", async () => {
    mockUserFindUnique.mockResolvedValue({ ...baseUser, subscriptions: [] });

    render(await ProfilePage());

    expect(screen.getByRole("button", { name: /déconnexion/i })).toBeInTheDocument();
  });
});

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminSubscriptionsPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSubscriptionFindMany = vi.hoisted(() => vi.fn());
const mockPaymentFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    subscription: { findMany: mockSubscriptionFindMany },
    payment: { findMany: mockPaymentFindMany },
  },
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
vi.mock("@/components/admin-subscription-actions", () => ({
  AdminSubscriptionActions: ({ subscriptionId, status }: { subscriptionId: string; status: string }) => (
    <div data-testid={`actions-${subscriptionId}`}>{status === "PENDING" ? "Valider Refuser" : "Suspendre"}</div>
  ),
}));

const pending = {
  id: "sub-pending",
  userId: "member-1",
  tier: "GRAND_FRERE",
  period: "MONTHLY",
  provider: "BANK_TRANSFER",
  providerRef: "IBC-member-1-GRAND_FRERE",
  status: "PENDING",
  startDate: new Date("2026-05-12T00:00:00.000Z"),
  endDate: null,
  createdAt: new Date("2026-05-13T00:00:00.000Z"),
  updatedAt: new Date("2026-05-13T00:00:00.000Z"),
  user: { name: "Awa Traoré", email: "awa@example.com" },
};

const active = {
  ...pending,
  id: "sub-active",
  userId: "member-2",
  providerRef: "IBC-member-2-BOSS",
  tier: "BOSS",
  status: "ACTIVE",
  user: { name: "Marc Diallo", email: "marc@example.com" },
};

describe("AdminSubscriptionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockPaymentFindMany.mockResolvedValue([
      { id: "pay-1", providerRef: "IBC-member-1-GRAND_FRERE", amount: 49, status: "pending" },
      { id: "pay-2", providerRef: "IBC-member-2-BOSS", amount: 99, status: "succeeded" },
    ]);
  });

  it("renders pending subscriptions with required bank-transfer fields and actions", async () => {
    mockSubscriptionFindMany
      .mockResolvedValueOnce([pending])
      .mockResolvedValueOnce([active]);

    render(await AdminSubscriptionsPage());

    const pendingSection = screen.getByRole("region", { name: "Virements en attente" });
    expect(within(pendingSection).getByText("Awa Traoré")).toBeInTheDocument();
    expect(within(pendingSection).getByText("awa@example.com")).toBeInTheDocument();
    expect(within(pendingSection).getByText("Grands Frères")).toBeInTheDocument();
    expect(within(pendingSection).getByText("49,00 €")).toBeInTheDocument();
    expect(within(pendingSection).getByText("13/05/2026")).toBeInTheDocument();
    expect(within(pendingSection).getByText("IBC-member-1-GRAND_FRERE")).toBeInTheDocument();
    expect(within(pendingSection).getByText(/Valider Refuser/)).toBeInTheDocument();
  });

  it("renders active subscriptions and suspend action, plus empty states", async () => {
    mockSubscriptionFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([active]);

    render(await AdminSubscriptionsPage());

    expect(screen.getByText("Aucun virement en attente")).toBeInTheDocument();
    const activeSection = screen.getByRole("region", { name: "Abonnements actifs" });
    expect(within(activeSection).getByText("Marc Diallo")).toBeInTheDocument();
    expect(within(activeSection).getByText("Boss")).toBeInTheDocument();
    expect(within(activeSection).getByText(/Suspendre/)).toBeInTheDocument();
  });

  it("renders active empty state", async () => {
    mockSubscriptionFindMany
      .mockResolvedValueOnce([pending])
      .mockResolvedValueOnce([]);

    render(await AdminSubscriptionsPage());

    expect(screen.getByText("Aucun abonnement actif")).toBeInTheDocument();
  });
});

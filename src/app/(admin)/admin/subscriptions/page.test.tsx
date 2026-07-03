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
vi.mock("@/lib/admin-access", () => ({
  promoteConfiguredAdminUser: vi.fn((userId: string) => ({ id: userId, role: "ADMIN", email: "admin@example.com" })),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
vi.mock("@/components/admin-subscription-actions", () => ({
  AdminSubscriptionActions: ({ subscriptionId, status }: { subscriptionId: string; status: string }) => (
    <div data-testid={`actions-${subscriptionId}`}>{status === "PENDING" || status === "TRIAL" ? "Valider Refuser" : "Suspendre"}</div>
  ),
}));
vi.mock("@/components/payment-provider-badge", () => ({
  PaymentProviderBadge: ({ provider, providerPhone, showPhone }: { provider: string; providerPhone?: string | null; showPhone?: boolean }) => {
    const label = provider === "BANK_TRANSFER" ? "Virement bancaire" : provider === "WAVE" ? "Wave" : "Orange Money";
    const cls = provider === "WAVE" ? "border-blue-200" : provider === "ORANGE_MONEY" ? "border-orange-200" : "border-slate-200";
    return (
      <div data-testid={`provider-badge-${provider}`}>
        <span className={cls}>{label}</span>
        {showPhone && providerPhone ? <span data-testid="provider-phone">{providerPhone}</span> : null}
      </div>
    );
  },
}));

const pending = {
  id: "sub-pending",
  userId: "member-1",
  tier: "GRAND_FRERE",
  period: "MONTHLY",
  provider: "BANK_TRANSFER",
  providerPhone: null,
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
  provider: "BANK_TRANSFER",
  providerPhone: null,
  providerRef: "IBC-member-2-BOSS",
  tier: "BOSS",
  period: "MONTHLY",
  createdAt: new Date("2026-05-14T00:00:00.000Z"),
  status: "ACTIVE",
  user: { name: "Marc Diallo", email: "marc@example.com" },
};

const trialWave = {
  ...pending,
  id: "sub-trial-wave",
  provider: "WAVE",
  providerPhone: "+225 01 23 45 67 89",
  createdAt: new Date("2026-05-15T00:00:00.000Z"),
  status: "TRIAL",
  user: { name: "Koffi Bamba", email: "koffi@example.com" },
};

const trialOrange = {
  ...pending,
  id: "sub-trial-orange",
  provider: "ORANGE_MONEY",
  providerPhone: "+221 77 123 45 67",
  createdAt: new Date("2026-05-16T00:00:00.000Z"),
  status: "TRIAL",
  user: { name: "Fatou Ndiaye", email: "fatou@example.com" },
};

describe("AdminSubscriptionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockPaymentFindMany.mockResolvedValue([
      { id: "pay-1", providerRef: "IBC-member-1-GRAND_FRERE", amount: 59, status: "pending" },
      { id: "pay-2", providerRef: "IBC-member-2-BOSS", amount: 129, status: "succeeded" },
    ]);
  });

  it("renders pending subscriptions with required bank-transfer fields and actions", async () => {
    mockSubscriptionFindMany
      .mockResolvedValueOnce([pending])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    render(await AdminSubscriptionsPage());

    const pendingSection = screen.getByRole("region", { name: "Abonnements à valider" });
    expect(within(pendingSection).getByText("Awa Traoré")).toBeInTheDocument();
    expect(within(pendingSection).getByText("awa@example.com")).toBeInTheDocument();
    expect(within(pendingSection).getByText("Grands Frères")).toBeInTheDocument();
    const row = within(pendingSection).getByText("Awa Traoré").closest("tr") as HTMLElement;
    expect(within(row).getByText("Mensuel")).toBeInTheDocument();
    expect(within(row).getByText("59,00 €")).toBeInTheDocument();
    expect(within(row).getByText("13/05/2026")).toBeInTheDocument();
    expect(within(row).getByText("—")).toBeInTheDocument();
    expect(within(pendingSection).getByText("IBC-member-1-GRAND_FRERE")).toBeInTheDocument();
    expect(within(pendingSection).getByText(/Valider Refuser/)).toBeInTheDocument();
  });

  it("renders active subscriptions and suspend action, plus empty states", async () => {
    mockSubscriptionFindMany
      .mockResolvedValueOnce([]) // PENDING
      .mockResolvedValueOnce([active]) // ACTIVE
      .mockResolvedValueOnce([]); // TRIAL

    render(await AdminSubscriptionsPage());

    const actionableSection = screen.getByRole("region", { name: "Abonnements à valider" });
    expect(within(actionableSection).getByText("Aucun abonnement à valider")).toBeInTheDocument();
    const activeSection = screen.getByRole("region", { name: "Abonnements actifs" });
    expect(within(activeSection).getByText("Marc Diallo")).toBeInTheDocument();
    expect(within(activeSection).getByText("Boss")).toBeInTheDocument();
    expect(within(activeSection).getByText("14/05/2026")).toBeInTheDocument();
    expect(within(activeSection).getByText(/Suspendre/)).toBeInTheDocument();
  });

  it("renders active empty state", async () => {
    mockSubscriptionFindMany
      .mockResolvedValueOnce([pending])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    render(await AdminSubscriptionsPage());

    expect(screen.getByText("Aucun abonnement actif")).toBeInTheDocument();
  });

  it("renders a TRIAL WAVE subscription with blue badge and mobile phone", async () => {
    mockSubscriptionFindMany
      .mockResolvedValueOnce([]) // PENDING
      .mockResolvedValueOnce([]) // ACTIVE
      .mockResolvedValueOnce([trialWave]); // TRIAL

    render(await AdminSubscriptionsPage());

    const actionableSection = screen.getByRole("region", { name: "Abonnements à valider" });
    expect(within(actionableSection).getByText("Koffi Bamba")).toBeInTheDocument();
    expect(within(actionableSection).getByText("Wave")).toBeInTheDocument();
    expect(within(actionableSection).getByTestId("provider-phone")).toHaveTextContent("+225 01 23 45 67 89");
    expect(actionableSection.querySelector(".border-blue-200")).toBeInTheDocument();
  });

  it("renders a TRIAL ORANGE_MONEY subscription with orange badge", async () => {
    mockSubscriptionFindMany
      .mockResolvedValueOnce([]) // PENDING
      .mockResolvedValueOnce([]) // ACTIVE
      .mockResolvedValueOnce([trialOrange]); // TRIAL

    render(await AdminSubscriptionsPage());

    const actionableSection = screen.getByRole("region", { name: "Abonnements à valider" });
    expect(within(actionableSection).getByText("Fatou Ndiaye")).toBeInTheDocument();
    expect(within(actionableSection).getByText("Orange Money")).toBeInTheDocument();
    expect(actionableSection.querySelector(".border-orange-200")).toBeInTheDocument();
  });
});

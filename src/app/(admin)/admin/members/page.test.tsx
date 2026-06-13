import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminMembersPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, findMany: mockUserFindMany },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/components/features/admin/admin-member-actions", () => ({
  AdminMemberActions: ({ status, isCurrentAdmin }: { status: string; isCurrentAdmin: boolean }) => (
    <div data-testid="member-actions">{status}:{isCurrentAdmin ? "self" : "other"}</div>
  ),
}));

describe("AdminMembersPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockUserFindMany.mockResolvedValue([
      {
        id: "member-1",
        image: null,
        name: "Awa Koné",
        email: "awa@example.com",
        tier: "GRAND_FRERE",
        status: "ACTIVE",
        verificationStatus: "PENDING",
        emailVerified: true,
        bio: "Une biographie",
        location: "Abidjan",
        country: "CI",
        createdAt: new Date("2026-05-10T10:00:00Z"),
        subscriptions: [{ id: "sub-1", status: "ACTIVE", tier: "GRAND_FRERE", providerRef: "IBC-1", createdAt: new Date() }],
      },
      {
        id: "member-2",
        image: null,
        name: "Jean Kouassi",
        email: "jean@example.com",
        tier: "AFFRANCHI",
        status: "SUSPENDED",
        verificationStatus: "PENDING",
        emailVerified: false,
        bio: null,
        location: null,
        country: null,
        createdAt: new Date("2026-05-11T10:00:00Z"),
        subscriptions: [],
      },
    ]);
  });

  it("redirects unauthenticated visitors to sign-in", async () => {
    mockAuth.mockResolvedValueOnce(null);

    await expect(AdminMembersPage()).rejects.toThrow("redirect:/auth/signin");
  });

  it("redirects non-admin users to the dashboard", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "member-1", role: "MEMBER" });

    await expect(AdminMembersPage()).rejects.toThrow("redirect:/dashboard");
  });

  it("renders member identity, tier, latest subscription, account status, date, and actions", async () => {
    render(await AdminMembersPage());

    expect(screen.getByRole("heading", { name: "Membres" })).toBeInTheDocument();
    expect(screen.getByText("Awa Koné")).toBeInTheDocument();
    expect(screen.getByText("awa@example.com")).toBeInTheDocument();
    expect(screen.getByText("Grand Frère")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByText("Suspendu")).toBeInTheDocument();
    expect(screen.getByText("Aucun abonnement")).toBeInTheDocument();
    expect(screen.getAllByTestId("member-actions")).toHaveLength(2);
  });

  it("renders a French empty state when no users exist", async () => {
    mockUserFindMany.mockResolvedValueOnce([]);

    render(await AdminMembersPage());

    expect(screen.getByText("Aucun utilisateur à afficher pour le moment.")).toBeInTheDocument();
  });
});

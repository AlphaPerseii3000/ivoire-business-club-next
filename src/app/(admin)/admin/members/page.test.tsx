import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminMembersPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockUserCount = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, findMany: mockUserFindMany, count: mockUserCount },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/components/features/admin/admin-member-actions", () => ({
  AdminMemberActions: ({ status, isCurrentAdmin }: { status: string; isCurrentAdmin: boolean }) => (
    <div data-testid="member-actions">{status}:{isCurrentAdmin ? "self" : "other"}</div>
  ),
}));
vi.mock("./_components/admin-member-search-input", () => ({
  AdminMemberSearchInput: ({ defaultValue }: { defaultValue?: string }) => (
    <input type="search" defaultValue={defaultValue ?? ""} data-testid="admin-member-search-input" />
  ),
}));
vi.mock("./_components/admin-member-filter-select", () => ({
  AdminMemberFilterSelect: ({ placeholder }: { placeholder?: string }) => (
    <select data-testid="admin-member-filter-select" data-placeholder={placeholder}></select>
  ),
}));

type MemberFixture = {
  id: string;
  image: string | null;
  name: string;
  email: string;
  tier: string;
  status: string;
  verificationStatus: string;
  emailVerified: boolean;
  onboardingCompletedAt: Date | null;
  bio: string | null;
  location: string | null;
  country: string | null;
  createdAt: Date;
  subscriptions: Array<Record<string, unknown>>;
};

function buildMember(overrides: Partial<MemberFixture> = {}) {
  return { ...baseMember(), ...overrides };
}

function baseMember(): MemberFixture {
  return {
    id: "member-1",
    image: null,
    name: "Awa Koné",
    email: "awa@example.com",
    tier: "GRAND_FRERE",
    status: "ACTIVE",
    verificationStatus: "PENDING",
    emailVerified: true,
    onboardingCompletedAt: new Date("2026-05-10T10:00:00Z"),
    bio: "Une biographie",
    location: "Abidjan",
    country: "CI",
    createdAt: new Date("2026-05-10T10:00:00Z"),
    subscriptions: [{ id: "sub-1", status: "ACTIVE", tier: "GRAND_FRERE", providerRef: "IBC-1", createdAt: new Date() }],
  };
}

function makeSearchParams(params: Record<string, string | string[]>) {
  return { searchParams: Promise.resolve(params) };
}

describe("AdminMembersPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockUserFindMany.mockResolvedValue([
      buildMember({
        id: "member-complete",
        name: "Awa Koné",
        email: "awa@example.com",
        tier: "BOSS",
        emailVerified: true,
        onboardingCompletedAt: new Date("2026-05-10T10:00:00Z"),
        bio: "Une biographie",
        location: "Abidjan",
        country: "CI",
      }),
      buildMember({
        id: "member-email-missing",
        name: "Jean Kouassi",
        email: "jean@example.com",
        tier: "AFFRANCHI",
        emailVerified: false,
        onboardingCompletedAt: new Date("2026-05-11T10:00:00Z"),
        bio: "Bio",
        location: "Bouaké",
        country: "CI",
      }),
      buildMember({
        id: "member-profile-missing",
        name: "Marie Yao",
        email: "marie@example.com",
        tier: "GRAND_FRERE",
        emailVerified: true,
        onboardingCompletedAt: null,
        bio: null,
        location: null,
        country: null,
      }),
      buildMember({
        id: "member-both-missing",
        name: "Paul Bamba",
        email: "paul@example.com",
        tier: "AFFRANCHI",
        emailVerified: false,
        onboardingCompletedAt: null,
        bio: null,
        location: null,
        country: null,
      }),
    ]);
    mockUserCount.mockResolvedValue(4);
  });

  it("redirects unauthenticated visitors to sign-in", async () => {
    mockAuth.mockResolvedValueOnce(null);

    await expect(AdminMembersPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/auth/signin");
  });

  it("redirects non-admin users to the dashboard", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "member-1", role: "MEMBER" });

    await expect(AdminMembersPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/dashboard");
  });

  it("renders member identity, tier, latest subscription, account status, date, and actions", async () => {
    const memberWithSuspended = buildMember({ id: "member-suspended", name: "Koffi Suspendu", email: "koffi@example.com", status: "SUSPENDED", tier: "AFFRANCHI", subscriptions: [] });
    mockUserFindMany.mockResolvedValueOnce([
      buildMember({ id: "member-active", name: "Awa Koné", email: "awa@example.com", tier: "BOSS" }),
      memberWithSuspended,
    ]);
    mockUserCount.mockResolvedValueOnce(2);

    render(await AdminMembersPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Membres" })).toBeInTheDocument();
    expect(screen.getByText("Awa Koné")).toBeInTheDocument();
    expect(screen.getByText("koffi@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("ACTIVE")).toHaveLength(1);
    expect(screen.getAllByText("Actif")).toHaveLength(1);
    expect(screen.getByText("Suspendu")).toBeInTheDocument();
    expect(screen.getByText("Aucun abonnement")).toBeInTheDocument();
    expect(screen.getAllByTestId("member-actions")).toHaveLength(2);
  });

  it("renders search input and filter selects", async () => {
    render(await AdminMembersPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("admin-member-search-input")).toBeInTheDocument();
    expect(screen.getAllByTestId("admin-member-filter-select")).toHaveLength(5);
  });

  it("renders a generic empty state when no users exist", async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    mockUserCount.mockResolvedValueOnce(0);

    render(await AdminMembersPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Aucun utilisateur à afficher pour le moment.")).toBeInTheDocument();
  });

  it("renders onboarding badges for all four combinations", async () => {
    render(await AdminMembersPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getAllByText("Email ✓")).toHaveLength(2);
    expect(screen.getAllByText("Email ✗")).toHaveLength(2);
    expect(screen.getAllByText("Profil ✓")).toHaveLength(2);
    expect(screen.getAllByText("Profil ✗")).toHaveLength(2);
  });

  it("filters members when incomplete=1 is set", async () => {
    mockUserFindMany.mockResolvedValueOnce([
      buildMember({
        id: "member-email-missing",
        name: "Jean Kouassi",
        email: "jean@example.com",
        tier: "AFFRANCHI",
        emailVerified: false,
        onboardingCompletedAt: new Date("2026-05-11T10:00:00Z"),
        bio: "Bio",
        location: "Bouaké",
        country: "CI",
      }),
      buildMember({
        id: "member-profile-missing",
        name: "Marie Yao",
        email: "marie@example.com",
        tier: "GRAND_FRERE",
        emailVerified: true,
        onboardingCompletedAt: null,
        bio: null,
        location: null,
        country: null,
      }),
      buildMember({
        id: "member-both-missing",
        name: "Paul Bamba",
        email: "paul@example.com",
        tier: "AFFRANCHI",
        emailVerified: false,
        onboardingCompletedAt: null,
        bio: null,
        location: null,
        country: null,
      }),
    ]);
    mockUserCount.mockResolvedValueOnce(3);

    render(await AdminMembersPage({ searchParams: Promise.resolve({ incomplete: "1" }) }));

    expect(screen.queryByText("Awa Koné")).not.toBeInTheDocument();
    expect(screen.getByText("Jean Kouassi")).toBeInTheDocument();
    expect(screen.getByText("Marie Yao")).toBeInTheDocument();
    expect(screen.getByText("Paul Bamba")).toBeInTheDocument();
    expect(screen.getByText("Incomplets uniquement")).toBeInTheDocument();
    expect(screen.getByText("Voir tous")).toBeInTheDocument();
  });

  it("shows the filter button when no filter is active", async () => {
    render(await AdminMembersPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Afficher les incomplèts")).toBeInTheDocument();
  });

  it("filters by name or email via ?q=", async () => {
    mockUserFindMany.mockResolvedValueOnce([buildMember({ id: "result", name: "Awa Koné", email: "awa@example.com" })]);
    mockUserCount.mockResolvedValueOnce(1);

    render(await AdminMembersPage(makeSearchParams({ q: "awa" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { name: { contains: "awa" } },
                { email: { contains: "awa" } },
              ],
            },
          ],
        }),
      })
    );
  });

  it("filters by tier via ?tier=", async () => {
    mockUserFindMany.mockResolvedValueOnce([buildMember({ id: "boss", name: "Boss User", tier: "BOSS" })]);
    mockUserCount.mockResolvedValueOnce(1);

    render(await AdminMembersPage(makeSearchParams({ tier: "BOSS" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [{ tier: "BOSS" }],
        }),
      })
    );
  });

  it("filters by subscription status via ?subscription=", async () => {
    mockUserFindMany.mockResolvedValueOnce([buildMember({ id: "active-sub", name: "Sub User" })]);
    mockUserCount.mockResolvedValueOnce(1);

    render(await AdminMembersPage(makeSearchParams({ subscription: "ACTIVE" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [{ subscriptions: { some: { status: "ACTIVE" } } }],
        }),
      })
    );
  });

  it("filters by account status via ?status=", async () => {
    mockUserFindMany.mockResolvedValueOnce([buildMember({ id: "suspended", name: "Suspended User", status: "SUSPENDED" })]);
    mockUserCount.mockResolvedValueOnce(1);

    render(await AdminMembersPage(makeSearchParams({ status: "SUSPENDED" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [{ status: "SUSPENDED" }],
        }),
      })
    );
  });

  it("filters by verification status via ?verification=", async () => {
    mockUserFindMany.mockResolvedValueOnce([buildMember({ id: "verified", name: "Verified User", verificationStatus: "VERIFIED" })]);
    mockUserCount.mockResolvedValueOnce(1);

    render(await AdminMembersPage(makeSearchParams({ verification: "VERIFIED" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [{ verificationStatus: "VERIFIED" }],
        }),
      })
    );
  });

  it("orders by name ascending via ?sort=name_asc", async () => {
    render(await AdminMembersPage(makeSearchParams({ sort: "name_asc" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: "asc" },
      })
    );
  });

  it("paginates results via ?page=", async () => {
    mockUserFindMany.mockResolvedValueOnce(Array.from({ length: 25 }, (_, i) => buildMember({ id: `member-${i}`, name: `Member ${i}` })));
    mockUserCount.mockResolvedValueOnce(60);

    render(await AdminMembersPage(makeSearchParams({ page: "2" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 25,
        take: 25,
      })
    );
    expect(screen.getByText("Page 2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Page précédente" })).toHaveAttribute("href", "/admin/members?page=1");
    expect(screen.getByRole("link", { name: "Page suivante" })).toHaveAttribute("href", "/admin/members?page=3");
  });

  it("ignores invalid params", async () => {
    render(await AdminMembersPage(makeSearchParams({ tier: "INVALID", subscription: "FAKE", status: "BAN", verification: "UNKNOWN", sort: "bad", page: "abc" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 25,
      })
    );
  });

  it("combines incomplete=1 with tier", async () => {
    mockUserFindMany.mockResolvedValueOnce([buildMember({ id: "incomplete-boss", name: "Incomplete Boss", tier: "BOSS", emailVerified: false })]);
    mockUserCount.mockResolvedValueOnce(1);

    render(await AdminMembersPage(makeSearchParams({ incomplete: "1", tier: "BOSS" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            { OR: [{ emailVerified: false }, { onboardingCompletedAt: null }] },
            { tier: "BOSS" },
          ],
        }),
      })
    );
  });

  it("combines q, subscription and status", async () => {
    mockUserFindMany.mockResolvedValueOnce([buildMember({ id: "combo", name: "Combo User" })]);
    mockUserCount.mockResolvedValueOnce(1);

    render(await AdminMembersPage(makeSearchParams({ q: "awa", subscription: "ACTIVE", status: "ACTIVE" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ subscriptions: { some: { status: "ACTIVE" } } }),
            expect.objectContaining({ status: "ACTIVE" }),
            expect.objectContaining({
              OR: [
                { name: { contains: "awa" } },
                { email: { contains: "awa" } },
              ],
            }),
          ]),
        }),
      })
    );
  });

  it("pagination links preserve active filters", async () => {
    mockUserFindMany.mockResolvedValueOnce(Array.from({ length: 25 }, (_, i) => buildMember({ id: `member-${i}`, name: `Member ${i}` })));
    mockUserCount.mockResolvedValueOnce(60);

    render(await AdminMembersPage(makeSearchParams({ q: "awa", tier: "BOSS", subscription: "ACTIVE", status: "SUSPENDED", verification: "VERIFIED", sort: "name_asc", page: "2" })));

    expect(screen.getByRole("link", { name: "Page précédente" })).toHaveAttribute(
      "href",
      "/admin/members?q=awa&tier=BOSS&subscription=ACTIVE&status=SUSPENDED&verification=VERIFIED&sort=name_asc&page=1"
    );
    expect(screen.getByRole("link", { name: "Page suivante" })).toHaveAttribute(
      "href",
      "/admin/members?q=awa&tier=BOSS&subscription=ACTIVE&status=SUSPENDED&verification=VERIFIED&sort=name_asc&page=3"
    );
  });

  it("default sort is createdAt desc when sort param is absent", async () => {
    render(await AdminMembersPage(makeSearchParams({})));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("renders generic empty state when only sort is active and no members", async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    mockUserCount.mockResolvedValueOnce(0);

    render(await AdminMembersPage(makeSearchParams({ sort: "name_asc" })));

    expect(screen.getByText("Aucun utilisateur à afficher pour le moment.")).toBeInTheDocument();
    expect(screen.queryByText("Aucun membre ne correspond à vos critères")).not.toBeInTheDocument();
  });

  it("renders reset empty state when filters match nothing", async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    mockUserCount.mockResolvedValueOnce(0);

    render(await AdminMembersPage(makeSearchParams({ q: "xyzinconnu" })));

    expect(screen.getByText("Aucun membre ne correspond à vos critères")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Réinitialiser les filtres" })).toHaveAttribute("href", "/admin/members");
  });

  it("keeps incomplete=1 link when other filters are active", async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    mockUserCount.mockResolvedValueOnce(0);

    render(await AdminMembersPage(makeSearchParams({ tier: "BOSS" })));

    expect(screen.getByText("Afficher les incomplèts")).toHaveAttribute("href", "/admin/members?tier=BOSS&incomplete=1");
  });

  it("shows Voir tous link preserving filters without incomplete", async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    mockUserCount.mockResolvedValueOnce(0);

    render(await AdminMembersPage(makeSearchParams({ incomplete: "1", tier: "BOSS" })));

    expect(screen.getByText("Voir tous")).toHaveAttribute("href", "/admin/members?tier=BOSS");
  });
});

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

  it("renders a French empty state when no users exist", async () => {
    mockUserFindMany.mockResolvedValueOnce([]);

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
});

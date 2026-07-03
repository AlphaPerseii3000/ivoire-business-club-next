import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MembersPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockUserCount = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: mockUserFindMany, count: mockUserCount },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));

vi.mock("./_components/member-search-input", () => ({
  MemberSearchInput: ({ defaultValue }: { defaultValue?: string }) => (
    <input type="search" defaultValue={defaultValue ?? ""} data-testid="member-search-input" />
  ),
}));

function verifiedMembers(count: number, overrides = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: `member-${i + 1}`,
    name: `Membre ${i + 1}`,
    bio: `Bio ${i + 1}`,
    image: null,
    location: "Abidjan",
    country: "CI",
    tier: "AFFRANCHI" as const,
    ...overrides,
  }));
}

function makeSearchParams(params: Record<string, string | string[]>) {
  return { searchParams: Promise.resolve(params) };
}

describe("MembersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "viewer-1", emailVerified: true, onboardingCompleted: true },
    });
    mockUserFindMany.mockResolvedValue(verifiedMembers(5));
    mockUserCount.mockResolvedValue(5);
  });

  it("renders the default list of verified members", async () => {
    render(await MembersPage({}));

    expect(screen.getByText("Membres")).toBeInTheDocument();
    expect(screen.getByTestId("member-search-input")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Filtrer par tier" })).toBeInTheDocument();
    expect(screen.getAllByText("Affranchi").length).toBeGreaterThanOrEqual(5);
  });

  it("filters members by name via ?q=", async () => {
    render(await MembersPage(makeSearchParams({ q: "Awa" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          verificationStatus: "VERIFIED",
          name: { contains: "Awa", mode: "insensitive" },
        }),
      })
    );
  });

  it("ignores invalid tier, sort and page params", async () => {
    render(await MembersPage(makeSearchParams({ tier: "INVALID", sort: "invalid", page: "abc" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          verificationStatus: "VERIFIED",
        }),
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      })
    );
  });

  it("combines search, tier and sort params", async () => {
    mockUserFindMany.mockResolvedValue(verifiedMembers(2, { tier: "BOSS" as const }));
    mockUserCount.mockResolvedValue(2);

    render(await MembersPage(makeSearchParams({ q: "Awa", tier: "BOSS", sort: "name_asc", page: "2" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          verificationStatus: "VERIFIED",
          name: { contains: "Awa", mode: "insensitive" },
          tier: "BOSS",
        }),
        orderBy: { name: "asc" },
        skip: 20,
        take: 20,
      })
    );
  });

  it("filters members by tier via ?tier=", async () => {
    mockUserFindMany.mockResolvedValue(verifiedMembers(2, { tier: "BOSS" as const }));
    mockUserCount.mockResolvedValue(2);

    render(await MembersPage(makeSearchParams({ tier: "BOSS" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          verificationStatus: "VERIFIED",
          tier: "BOSS",
        }),
      })
    );
    expect(screen.getAllByText("Boss").length).toBeGreaterThanOrEqual(2);
  });

  it("orders members by name ascending via ?sort=name_asc", async () => {
    render(await MembersPage(makeSearchParams({ sort: "name_asc" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: "asc" },
      })
    );
  });

  it("paginates results via ?page=", async () => {
    mockUserFindMany.mockResolvedValue(verifiedMembers(20));
    mockUserCount.mockResolvedValue(45);

    render(await MembersPage(makeSearchParams({ page: "2" })));

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
      })
    );
    expect(screen.getByText("Page 2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Page précédente" })).toHaveAttribute("href", "/members?page=1");
    expect(screen.getByRole("link", { name: "Page suivante" })).toHaveAttribute("href", "/members?page=3");
  });

  it("renders empty state when no members match", async () => {
    mockUserFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    render(await MembersPage(makeSearchParams({ q: "xyzinconnu" })));

    expect(screen.getByText("Aucun membre ne correspond à vos critères")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Réinitialiser les filtres" })).toHaveAttribute("href", "/members");
  });

  it("renders empty state when there are no verified members at all", async () => {
    mockUserFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    render(await MembersPage({}));

    expect(screen.getByText("Aucun membre ne correspond à vos critères")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to signin", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(MembersPage({})).rejects.toThrow("redirect:/auth/signin");
  });

  it("redirects users with incomplete onboarding", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "viewer-1", emailVerified: true, onboardingCompleted: false },
    });

    await expect(MembersPage({})).rejects.toThrow("redirect:/dashboard?incomplete=1");
  });
});

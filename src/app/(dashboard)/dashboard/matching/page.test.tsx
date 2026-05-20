import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MatchingPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockOpportunityFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    opportunity: { findMany: mockOpportunityFindMany },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));

describe("MatchingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "member-1", role: "MEMBER", tier: "BOSS", tags: [{ category: "SECTEUR", value: "tech" }, { category: "LOCALISATION", value: "abidjan" }] });
    mockOpportunityFindMany.mockResolvedValue([]);
  });

  it("shows an edit-tags empty state when the member has no tags", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "member-1", role: "MEMBER", tier: "AFFRANCHI", tags: [] });

    render(await MatchingPage());

    expect(screen.getByText("Ajoutez des tags à votre profil")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Modifier mes tags" })).toHaveAttribute("href", "/profile/edit");
    expect(mockOpportunityFindMany).not.toHaveBeenCalled();
  });

  it("shows the exact no-match EmptyState and CTA when no visible deal matches", async () => {
    mockOpportunityFindMany.mockResolvedValueOnce([
      {
        id: "opp-1",
        title: "Deal agriculture",
        amount: null,
        verificationStatus: "VERIFIED",
        requiresDoubleVerification: false,
        createdAt: new Date("2026-05-20T00:00:00.000Z"),
        tags: [{ category: "SECTEUR", value: "agriculture" }],
        author: { id: "author-1", name: "Koffi", phone: null, location: "Abidjan", opportunities: [] },
        _count: { documents: 0, verificationApprovals: 0 },
      },
    ]);

    render(await MatchingPage());

    expect(screen.getByText("Aucun deal ne correspond à vos critères actuels")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Modifier mes tags" })).toHaveAttribute("href", "/profile/edit");
  });

  it("renders only matches sorted by common tag count", async () => {
    mockOpportunityFindMany.mockResolvedValueOnce([
      {
        id: "opp-1",
        title: "Match un tag récent",
        amount: 1000,
        verificationStatus: "VERIFIED",
        requiresDoubleVerification: false,
        createdAt: new Date("2026-05-20T00:00:00.000Z"),
        tags: [{ category: "SECTEUR", value: "tech" }],
        author: { id: "author-1", name: "Koffi", phone: null, location: "Abidjan", opportunities: [] },
        _count: { documents: 1, verificationApprovals: 0 },
      },
      {
        id: "opp-2",
        title: "Match deux tags",
        amount: 2000,
        verificationStatus: "VERIFIED",
        requiresDoubleVerification: false,
        createdAt: new Date("2026-05-19T00:00:00.000Z"),
        tags: [{ category: "SECTEUR", value: "tech" }, { category: "LOCALISATION", value: "abidjan" }],
        author: { id: "author-2", name: "Aya", phone: null, location: "Cocody", opportunities: [] },
        _count: { documents: 2, verificationApprovals: 0 },
      },
      {
        id: "opp-3",
        title: "Sans match",
        amount: 3000,
        verificationStatus: "VERIFIED",
        requiresDoubleVerification: false,
        createdAt: new Date("2026-05-21T00:00:00.000Z"),
        tags: [{ category: "SECTEUR", value: "agriculture" }],
        author: { id: "author-3", name: "Ali", phone: null, location: "Bouaké", opportunities: [] },
        _count: { documents: 0, verificationApprovals: 0 },
      },
    ]);

    render(await MatchingPage());

    const titles = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(titles).toEqual(["Match deux tags", "Match un tag récent"]);
    expect(screen.queryByText("Sans match")).not.toBeInTheDocument();
    expect(screen.getByText("2 tags communs")).toBeInTheDocument();
  });
});

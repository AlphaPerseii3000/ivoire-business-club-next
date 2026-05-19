import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockOpportunityFindMany = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    opportunity: { findMany: mockOpportunityFindMany },
    user: { findUnique: mockUserFindUnique },
  },
}));

describe("GET /api/opportunities visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only public teaser fields when public mode is requested", async () => {
    mockOpportunityFindMany.mockResolvedValue([
      {
        id: "opp-1",
        title: "Terrain à Cocody",
        description: "NE PAS EXPOSER",
        amount: 25000,
        author: { location: "Abidjan", phone: "+22501020304" },
        _count: { documents: 3 },
      },
    ]);

    const response = await GET(new Request("http://localhost/api/opportunities?public=true"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([{ id: "opp-1", title: "Terrain à Cocody", location: "Abidjan" }]);
    expect(JSON.stringify(payload)).not.toContain("NE PAS EXPOSER");
    expect(JSON.stringify(payload)).not.toContain("25000");
    expect(JSON.stringify(payload)).not.toContain("phone");
    expect(JSON.stringify(payload)).not.toContain("documents");
  });

  it("filters member API results by verified status and Affranchi tier plus own opportunities", async () => {
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockUserFindUnique.mockResolvedValue({ role: "MEMBER", tier: "AFFRANCHI" });
    mockOpportunityFindMany.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/api/opportunities"));

    expect(response.status).toBe(200);
    expect(mockOpportunityFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { verificationStatus: "VERIFIED", requiredTier: { in: ["AFFRANCHI"] } },
          { authorId: "member-1" },
        ],
      },
    }));
  });

  it("allows admins to list all opportunities", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ role: "ADMIN", tier: "BOSS" });
    mockOpportunityFindMany.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/api/opportunities"));

    expect(response.status).toBe(200);
    expect(mockOpportunityFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
  });
});

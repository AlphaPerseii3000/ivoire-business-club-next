import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockOpportunityFindMany = vi.hoisted(() => vi.fn());
const mockOpportunityCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn((callback) => callback({ opportunity: { create: mockOpportunityCreate } })));
const mockRateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mockTransaction,
    opportunity: { findMany: mockOpportunityFindMany },
    user: { findUnique: mockUserFindUnique },
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  opportunityCreateRateLimiter: { limit: mockRateLimit },
  getClientIp: () => "127.0.0.1",
}));

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/opportunities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const opportunityRow = {
  id: "opp-1",
  title: "Terrain à Cocody",
  description: "Description complète",
  category: "IMMOBILIER",
  amount: 25000,
  requiredTier: "AFFRANCHI",
  verificationStatus: "VERIFIED",
  createdAt: new Date("2026-05-20"),
  authorId: "author-1",
  rejectionNote: null,
  requiresDoubleVerification: false,
  author: {
    id: "author-1",
    name: "Awa",
    location: "Abidjan",
    phone: "+22501020304",
    opportunities: [],
  },
  tags: [{ category: "LOCALISATION", value: "cocody" }],
  _count: { documents: 3, verificationApprovals: 1 },
};

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
        author: { location: "Abidjan", phone: "+225****0304" },
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
        AND: [
          { OR: [
            { verificationStatus: "VERIFIED", requiredTier: { in: ["AFFRANCHI"] } },
            { authorId: "member-1" },
          ] },
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
    expect(mockOpportunityFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("filters by tag and returns tags in data", async () => {
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockUserFindUnique.mockResolvedValue({ role: "MEMBER", tier: "AFFRANCHI" });
    mockOpportunityFindMany.mockResolvedValue([opportunityRow]);

    const response = await GET(new Request("http://localhost/api/opportunities?tagCategory=LOCALISATION&tagValue=cocody"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockOpportunityFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          { tags: { some: { category: "LOCALISATION", value: "cocody" } } },
        ]),
      }),
    }));
    expect(payload.data[0].tags).toEqual([{ category: "LOCALISATION", value: "cocody" }]);
  });
});

describe("POST /api/opportunities tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true, limit: 2, remaining: 1, reset: 0 });
  });

  it("creates an opportunity with deduplicated tags", async () => {
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockOpportunityCreate.mockResolvedValue({ id: "opp-1", tags: [{ category: "SECTEUR", value: "tech" }] });

    const response = await POST(makePostRequest({
      title: "Projet tech à Abidjan",
      description: "Une opportunité de partenariat très détaillée.",
      category: "BUSINESS",
      amount: 75000,
      tags: [
        { category: "SECTEUR", value: "tech" },
        { category: "SECTEUR", value: "tech" },
      ],
    }));

    expect(response.status).toBe(201);
    expect(mockOpportunityCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        requiresDoubleVerification: true,
        tags: { create: [{ category: "SECTEUR", value: "tech" }] },
      }),
    }));
  });

  it("rejects invalid tags", async () => {
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });

    const response = await POST(makePostRequest({
      title: "Projet tech à Abidjan",
      description: "Une opportunité de partenariat très détaillée.",
      category: "BUSINESS",
      tags: [{ category: "SECTEUR", value: "inconnu" }],
    }));

    expect(response.status).toBe(400);
    expect(mockOpportunityCreate).not.toHaveBeenCalled();
  });

  it("returns 429 when IP-based rate limit is exceeded", async () => {
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockRateLimit.mockResolvedValue({ success: false, limit: 2, remaining: 0, reset: 1234567890 });

    const response = await POST(makePostRequest({
      title: "Projet tech à Abidjan",
      description: "Une opportunité de partenariat très détaillée.",
      category: "BUSINESS",
      amount: 75000,
    }));

    const payload = await response.json();
    expect(response.status).toBe(429);
    expect(payload.code).toBe("RATE_LIMITED");
    expect(response.headers.get("Retry-After")).toBeDefined();
    expect(mockOpportunityCreate).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockArticleFindMany = vi.hoisted(() => vi.fn());
const mockArticleCreate = vi.hoisted(() => vi.fn());
const mockArticleFindUnique = vi.hoisted(() => vi.fn());
const mockArticleFindFirst = vi.hoisted(() => vi.fn());
const mockHasActiveSubscription = vi.hoisted(() => vi.fn());
const mockUserUpsert = vi.hoisted(() => vi.fn());
const mockArticleDeleteMany = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());
const mockSubscriptionUpsert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({
  hasActiveSubscription: mockHasActiveSubscription,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findMany: mockArticleFindMany,
      create: mockArticleCreate,
      findUnique: mockArticleFindUnique,
      findFirst: mockArticleFindFirst,
      deleteMany: mockArticleDeleteMany,
    },
    user: {
      upsert: mockUserUpsert,
    },
    subscription: {
      upsert: mockSubscriptionUpsert,
    },
    $disconnect: vi.fn(),
  },
}));
vi.mock("@/lib/audit-log", () => ({
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/articles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockArticles = [
  {
    id: "art-1",
    title: "Article Public",
    slug: "article-public",
    excerpt: "Description de l'article public",
    content: "Contenu de l'article public",
    category: "Investissement",
    visibility: "PUBLIC",
    published: true,
    publishedAt: new Date("2026-06-10"),
    authorId: "admin-1",
  },
  {
    id: "art-2",
    title: "Article Affranchi",
    slug: "article-affranchi",
    excerpt: "Description de l'article affranchi",
    content: "Contenu de l'article affranchi",
    category: "Immobilier",
    visibility: "AFFRANCHI",
    published: true,
    publishedAt: new Date("2026-06-11"),
    authorId: "admin-1",
  },
  {
    id: "art-3",
    title: "Article Boss",
    slug: "article-boss",
    excerpt: "Description de l'article boss",
    content: "Contenu de l'article boss",
    category: "Business",
    visibility: "BOSS",
    published: true,
    publishedAt: new Date("2026-06-12"),
    authorId: "admin-1",
  },
  {
    id: "art-4",
    title: "Article Draft Admin",
    slug: "article-draft-admin",
    excerpt: "Description de l'article draft",
    content: "Contenu de l'article draft",
    category: "Business",
    visibility: "PUBLIC",
    published: false,
    publishedAt: null,
    authorId: "admin-1",
  },
];

describe("GET /api/articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only PUBLIC published articles when visitor is not logged in", async () => {
    mockAuth.mockResolvedValue(null);
    mockArticleFindMany.mockResolvedValue([mockArticles[0]]);

    const response = await GET(new Request("http://localhost/api/articles"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].id).toBe("art-1");
    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          published: true,
          visibility: { in: ["PUBLIC"] },
        },
      })
    );
  });

  it("returns only PUBLIC published articles when user has no active subscription", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER", tier: "AFFRANCHI" } });
    mockHasActiveSubscription.mockResolvedValue(false);
    mockArticleFindMany.mockResolvedValue([mockArticles[0]]);

    const response = await GET(new Request("http://localhost/api/articles"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          published: true,
          visibility: { in: ["PUBLIC"] },
        },
      })
    );
  });

  it("returns PUBLIC and AFFRANCHI articles for subscribed AFFRANCHI tier", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER", tier: "AFFRANCHI" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindMany.mockResolvedValue([mockArticles[0], mockArticles[1]]);

    const response = await GET(new Request("http://localhost/api/articles"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          published: true,
          visibility: { in: ["PUBLIC", "AFFRANCHI"] },
        },
      })
    );
  });

  it("returns all published articles (up to BOSS) for subscribed BOSS tier", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER", tier: "BOSS" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindMany.mockResolvedValue([mockArticles[0], mockArticles[1], mockArticles[2]]);

    const response = await GET(new Request("http://localhost/api/articles"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          published: true,
          visibility: { in: ["PUBLIC", "AFFRANCHI", "GRAND_FRERE", "BOSS"] },
        },
      })
    );
  });

  it("allows admin to see all articles including drafts", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockArticleFindMany.mockResolvedValue(mockArticles);

    const response = await GET(new Request("http://localhost/api/articles"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(4);
    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
  });
});

describe("POST /api/articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized user (non-admin)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    const response = await POST(
      makePostRequest({
        title: "Titre de test",
        excerpt: "Résumé de test long",
        content: "Contenu de test long",
        category: "Investissement",
        visibility: "PUBLIC",
      })
    );

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error).toBe("Non autorisé");
  });

  it("creates an article with default draft status and auto-generated slug for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockArticleFindFirst.mockResolvedValue(null);
    mockArticleCreate.mockResolvedValue({
      id: "art-5",
      title: "Nouveau titre",
      slug: "nouveau-titre",
      published: false,
    });

    const response = await POST(
      makePostRequest({
        title: "Nouveau titre",
        excerpt: "Ceci est un extrait d'article suffisant",
        content: "Ceci est le contenu de l'article de test assez long",
        category: "Investissement",
        visibility: "PUBLIC",
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.id).toBe("art-5");
    expect(payload.slug).toBe("nouveau-titre");
    expect(mockArticleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Nouveau titre",
          slug: "nouveau-titre",
          published: false,
          authorId: "admin-1",
        }),
      })
    );
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "ARTICLE_CREATE",
        entityType: "ARTICLE",
        entityId: "art-5",
      })
    );
  });

  it("handles slug collision correctly by appending counter", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    // First lookup finds a collision, second lookup finds no collision
    mockArticleFindFirst
      .mockResolvedValueOnce({ id: "existing-id" })
      .mockResolvedValueOnce(null);

    mockArticleCreate.mockResolvedValue({
      id: "art-6",
      title: "Collision Titre",
      slug: "collision-titre-1",
    });

    const response = await POST(
      makePostRequest({
        title: "Collision Titre",
        excerpt: "Ceci est un extrait d'article suffisant",
        content: "Ceci est le contenu de l'article de test assez long",
        category: "Investissement",
        visibility: "PUBLIC",
      })
    );

    expect(response.status).toBe(201);
    expect(mockArticleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "collision-titre-1",
        }),
      })
    );
  });

  it("returns 400 when body has malformed JSON", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const badRequest = new Request("http://localhost/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid-json",
    });

    const response = await POST(badRequest);
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe("Corps de requête JSON invalide ou vide");
  });
});

describe("Database Seeding", () => {
  it("executes database seeding successfully", async () => {
    mockUserUpsert
      .mockResolvedValueOnce({ id: "admin-1", email: "admin@ivoire-business-club.com" })
      .mockResolvedValueOnce({ id: "member-1", email: "member-affranchi@test.com", tier: "AFFRANCHI" })
      .mockResolvedValueOnce({ id: "member-2", email: "member-grandfrere@test.com", tier: "GRAND_FRERE" })
      .mockResolvedValueOnce({ id: "member-3", email: "member-boss@test.com", tier: "BOSS" });

    mockSubscriptionUpsert.mockResolvedValue({ id: "sub-1", status: "ACTIVE" });
    mockArticleDeleteMany.mockResolvedValue({ count: 4 });
    mockArticleCreate.mockResolvedValue({ id: "seeded-art", title: "seeded" });

    // Mock console.log to avoid polluting output
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Run seed by importing dynamically and calling main
    const seed = await import("../../../../prisma/seed?update=" + Date.now());
    await seed.main();

    expect(mockUserUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "admin@ivoire-business-club.com" },
      })
    );
    expect(mockArticleDeleteMany).toHaveBeenCalled();
    expect(mockArticleCreate).toHaveBeenCalledTimes(4);

    consoleLogSpy.mockRestore();
  });
});

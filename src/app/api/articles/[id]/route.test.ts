import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT, DELETE } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockArticleFindUnique = vi.hoisted(() => vi.fn());
const mockArticleFindFirst = vi.hoisted(() => vi.fn());
const mockArticleUpdate = vi.hoisted(() => vi.fn());
const mockArticleDelete = vi.hoisted(() => vi.fn());
const mockHasActiveSubscription = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({
  hasActiveSubscription: mockHasActiveSubscription,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findUnique: mockArticleFindUnique,
      findFirst: mockArticleFindFirst,
      update: mockArticleUpdate,
      delete: mockArticleDelete,
    },
  },
}));

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/articles/test-id", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const mockArticle = {
  id: "art-1",
  title: "Article Affranchi",
  slug: "article-affranchi",
  excerpt: "Résumé",
  content: "Contenu très long et détaillé",
  category: "Investissement",
  visibility: "AFFRANCHI",
  published: true,
  publishedAt: new Date("2026-06-11"),
  authorId: "admin-1",
};

describe("GET /api/articles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 if article is not found", async () => {
    mockArticleFindUnique.mockResolvedValue(null);
    mockArticleFindFirst.mockResolvedValue(null);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "unknown" }) });
    expect(response.status).toBe(404);
  });

  it("returns 404 for visitor when article is not PUBLIC", async () => {
    mockAuth.mockResolvedValue(null);
    mockArticleFindUnique.mockResolvedValue(mockArticle);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(404);
  });

  it("returns 200 for visitor when article is PUBLIC and published", async () => {
    mockAuth.mockResolvedValue(null);
    mockArticleFindUnique.mockResolvedValue({
      ...mockArticle,
      visibility: "PUBLIC",
    });

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.id).toBe("art-1");
  });

  it("returns 200 for subscribed member with matching tier", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER", tier: "AFFRANCHI" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindUnique.mockResolvedValue(mockArticle);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(200);
  });

  it("returns 404 for subscribed member with lower tier", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER", tier: "AFFRANCHI" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindUnique.mockResolvedValue({
      ...mockArticle,
      visibility: "BOSS",
    });

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(404);
  });

  it("returns 200 for admin even if article is draft or higher tier", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockArticleFindUnique.mockResolvedValue({
      ...mockArticle,
      published: false,
      visibility: "BOSS",
    });

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(200);
  });
});

describe("PUT /api/articles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    const response = await PUT(makeRequest("PUT", { title: "Nouveau titre" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("updates fields and returns updated article for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockArticleFindUnique.mockResolvedValue(mockArticle);
    mockArticleUpdate.mockResolvedValue({
      ...mockArticle,
      title: "Titre mis à jour",
      slug: "titre-mis-a-jour",
    });
    // First lookup for slug collision finds no collision
    mockArticleFindFirst.mockResolvedValue(null);

    const response = await PUT(makeRequest("PUT", { title: "Titre mis à jour" }), {
      params: Promise.resolve({ id: "art-1" }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.title).toBe("Titre mis à jour");
    expect(payload.slug).toBe("titre-mis-a-jour");
  });
});

describe("DELETE /api/articles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    const response = await DELETE(makeRequest("DELETE"), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("deletes article and returns ok: true for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockArticleFindUnique.mockResolvedValue(mockArticle);
    mockArticleDelete.mockResolvedValue(mockArticle);

    const response = await DELETE(makeRequest("DELETE"), {
      params: Promise.resolve({ id: "art-1" }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.ok).toBe(true);
    expect(mockArticleDelete).toHaveBeenCalledWith({
      where: { id: "art-1" },
    });
  });
});

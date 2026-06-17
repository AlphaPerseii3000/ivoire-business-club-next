import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockArticleFindFirst = vi.hoisted(() => vi.fn());
const mockCommentFindMany = vi.hoisted(() => vi.fn());
const mockCommentCreate = vi.hoisted(() => vi.fn());
const mockHasActiveSubscription = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({
  hasActiveSubscription: mockHasActiveSubscription,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findFirst: mockArticleFindFirst,
    },
    comment: {
      findMany: mockCommentFindMany,
      create: mockCommentCreate,
    },
  },
}));
vi.mock("@/lib/audit-log", () => ({
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/articles/art-1/comments", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const mockArticle = {
  id: "art-1",
  title: "Article de test",
  slug: "article-de-test",
};

const mockComments = [
  {
    id: "com-1",
    content: "Excellent article !",
    createdAt: new Date("2026-06-16T12:00:00Z"),
    userId: "user-1",
    articleId: "art-1",
    user: {
      id: "user-1",
      name: "Jean Dupont",
      image: "/avatars/jean.png",
    },
  },
];

describe("GET /api/articles/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 403 if user is not subscribed and not admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(false);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(403);
  });

  it("returns 404 if article is not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindFirst.mockResolvedValue(null);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(404);
  });

  it("returns 200 with comments for active subscriber", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindFirst.mockResolvedValue(mockArticle);
    mockCommentFindMany.mockResolvedValue(mockComments);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({ comments: JSON.parse(JSON.stringify(mockComments)) });
    expect(mockCommentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { articleId: "art-1" },
        orderBy: { createdAt: "asc" },
        take: 100,
      })
    );
  });

  it("returns 404 if article is not published and user is not admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindFirst.mockImplementation(({ where }) => {
      // Simulate no article found because where clause enforces published: true for MEMBER
      if (where.published === true) return Promise.resolve(null);
      return Promise.resolve(mockArticle);
    });

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(404);
  });

  it("returns 200 with comments if article is not published but user is admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindFirst.mockResolvedValue(mockArticle);
    mockCommentFindMany.mockResolvedValue(mockComments);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({ comments: JSON.parse(JSON.stringify(mockComments)) });
  });
});

describe("POST /api/articles/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(makeRequest("POST", { content: "Un commentaire" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 403 if user is not subscribed and not admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(false);

    const response = await POST(makeRequest("POST", { content: "Un commentaire" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("returns 404 if article is not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindFirst.mockResolvedValue(null);

    const response = await POST(makeRequest("POST", { content: "Un commentaire" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 400 when body has malformed JSON", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindFirst.mockResolvedValue(mockArticle);

    const badRequest = new Request("http://localhost/api/articles/art-1/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid-json",
    });

    const response = await POST(badRequest, { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe("Corps de requête JSON invalide ou vide");
  });

  it("returns 400 if comment content is too short", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindFirst.mockResolvedValue(mockArticle);

    const response = await POST(makeRequest("POST", { content: "a" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe("Le commentaire doit contenir au moins 2 caractères");
  });

  it("returns 400 if comment content is too long", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindFirst.mockResolvedValue(mockArticle);

    const response = await POST(makeRequest("POST", { content: "a".repeat(1001) }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe("Le commentaire ne doit pas dépasser 1000 caractères");
  });

  it("creates comment and returns 201 with created comment for active subscriber", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindFirst.mockResolvedValue(mockArticle);

    const newComment = {
      id: "com-2",
      content: "Un super commentaire !",
      createdAt: new Date(),
      userId: "user-1",
      articleId: "art-1",
      user: {
        id: "user-1",
        name: "Jean Dupont",
        image: "/avatars/jean.png",
      },
    };
    mockCommentCreate.mockResolvedValue(newComment);

    const response = await POST(makeRequest("POST", { content: "  Un super commentaire !  " }), {
      params: Promise.resolve({ id: "art-1" }),
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload).toEqual(JSON.parse(JSON.stringify(newComment)));
    expect(mockCommentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          content: "Un super commentaire !",
          userId: "user-1",
          articleId: "art-1",
        },
      })
    );
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "user-1",
        action: "COMMENT_CREATE",
        entityType: "Comment",
        entityId: "com-2",
        metadata: {
          articleId: "art-1",
        },
      })
    );
  });

  it("returns 404 if article is not published and user is not admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindFirst.mockImplementation(({ where }) => {
      if (where.published === true) return Promise.resolve(null);
      return Promise.resolve(mockArticle);
    });

    const response = await POST(makeRequest("POST", { content: "Un commentaire" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(404);
  });
});

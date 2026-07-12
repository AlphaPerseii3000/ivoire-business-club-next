import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST, PUT, DELETE } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockArticleFindFirst = vi.hoisted(() => vi.fn());
const mockCommentFindMany = vi.hoisted(() => vi.fn());
const mockCommentCreate = vi.hoisted(() => vi.fn());
const mockCommentFindUnique = vi.hoisted(() => vi.fn());
const mockCommentUpdate = vi.hoisted(() => vi.fn());
const mockHasActiveSubscription = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());
const mockCommentCreateRateLimiterLimit = vi.hoisted(() => vi.fn());

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
      findUnique: mockCommentFindUnique,
      update: mockCommentUpdate,
    },
  },
}));
vi.mock("@/lib/audit-log", () => ({
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));
vi.mock("@/lib/rate-limit", () => ({
  commentCreateRateLimiter: {
    limit: mockCommentCreateRateLimiterLimit,
  },
}));

function makeRequest(method: string, body?: unknown, url = "http://localhost/api/articles/art-1/comments") {
  return new Request(url, {
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
    deletedAt: null,
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
  });

  it("masks content for soft-deleted comments", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);
    mockArticleFindFirst.mockResolvedValue(mockArticle);
    mockCommentFindMany.mockResolvedValue([
      {
        ...mockComments[0],
        deletedAt: new Date("2026-06-16T13:00:00Z"),
      },
    ]);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.comments[0].content).toBe("Ce commentaire a été supprimé.");
  });
});

describe("POST /api/articles/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCommentCreateRateLimiterLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: 0 });
  });

  it("returns 401 if user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(makeRequest("POST", { content: "Un commentaire" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 429 if rate limit is exceeded", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockCommentCreateRateLimiterLimit.mockResolvedValue({ success: false, limit: 5, remaining: 0, reset: Date.now() + 60000 });

    const response = await POST(makeRequest("POST", { content: "Un commentaire" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeDefined();
  });

  it("creates comment and returns 201 for active subscriber", async () => {
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
  });
});

describe("PUT /api/articles/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await PUT(makeRequest("PUT", { commentId: "com-1", content: "Modified content" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 if comment not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockCommentFindUnique.mockResolvedValue(null);

    const response = await PUT(makeRequest("PUT", { commentId: "com-1", content: "Modified content" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 403 if not the author", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-2", role: "MEMBER" } });
    mockCommentFindUnique.mockResolvedValue({
      id: "com-1",
      userId: "user-1",
      deletedAt: null,
    });

    const response = await PUT(makeRequest("PUT", { commentId: "com-1", content: "Modified content" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("returns 200 and updates comment if authorized author", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockCommentFindUnique.mockResolvedValue({
      id: "com-1",
      userId: "user-1",
      deletedAt: null,
    });
    mockCommentUpdate.mockResolvedValue({
      id: "com-1",
      content: "Modified content",
      userId: "user-1",
    });

    const response = await PUT(makeRequest("PUT", { commentId: "com-1", content: "Modified content" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.content).toBe("Modified content");
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "user-1",
        action: "COMMENT_UPDATE",
        entityType: "Comment",
        entityId: "com-1",
      })
    );
  });
});

describe("DELETE /api/articles/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await DELETE(makeRequest("DELETE", { commentId: "com-1" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 if comment not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockCommentFindUnique.mockResolvedValue(null);

    const response = await DELETE(makeRequest("DELETE", { commentId: "com-1" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 403 if not author and not admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-2", role: "MEMBER" } });
    mockCommentFindUnique.mockResolvedValue({
      id: "com-1",
      userId: "user-1",
      deletedAt: null,
    });

    const response = await DELETE(makeRequest("DELETE", { commentId: "com-1" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("returns 200 and soft-deletes comment if user is author", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockCommentFindUnique.mockResolvedValue({
      id: "com-1",
      userId: "user-1",
      deletedAt: null,
    });
    mockCommentUpdate.mockResolvedValue({ id: "com-1" });

    const response = await DELETE(makeRequest("DELETE", { commentId: "com-1" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(200);
    expect(mockCommentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "com-1" },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      })
    );
  });

  it("returns 200 and soft-deletes comment if user is admin (even if not author)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockCommentFindUnique.mockResolvedValue({
      id: "com-1",
      userId: "user-1",
      deletedAt: null,
    });
    mockCommentUpdate.mockResolvedValue({ id: "com-1" });

    const response = await DELETE(makeRequest("DELETE", null, "http://localhost/api/articles/art-1/comments?commentId=com-1"), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(200);
    expect(mockCommentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "com-1" },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      })
    );
  });
});

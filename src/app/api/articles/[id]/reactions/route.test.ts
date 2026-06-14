import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const mockAuth = vi.hoisted(() => vi.fn());
const mockArticleFindFirst = vi.hoisted(() => vi.fn());
const mockReactionGroupBy = vi.hoisted(() => vi.fn());
const mockReactionFindUnique = vi.hoisted(() => vi.fn());
const mockReactionCreate = vi.hoisted(() => vi.fn());
const mockReactionUpdate = vi.hoisted(() => vi.fn());
const mockReactionDelete = vi.hoisted(() => vi.fn());
const mockHasActiveSubscription = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({
  hasActiveSubscription: mockHasActiveSubscription,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findFirst: mockArticleFindFirst,
    },
    articleReaction: {
      groupBy: mockReactionGroupBy,
      findUnique: mockReactionFindUnique,
      create: mockReactionCreate,
      update: mockReactionUpdate,
      delete: mockReactionDelete,
    },
  },
}));

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/articles/test-id/reactions", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const mockArticle = {
  id: "art-1",
  title: "Article de Test",
  slug: "article-de-test",
  excerpt: "Résumé",
  content: "Contenu",
  category: "Conseil",
  visibility: "PUBLIC",
  published: true,
  publishedAt: new Date("2026-06-11"),
  authorId: "admin-1",
};

describe("GET /api/articles/[id]/reactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 if article not found", async () => {
    mockArticleFindFirst.mockResolvedValue(null);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "unknown" }) });
    expect(response.status).toBe(404);
  });

  it("returns 404 for visitor when article is not published", async () => {
    mockAuth.mockResolvedValue(null);
    mockArticleFindFirst.mockResolvedValue({
      ...mockArticle,
      published: false,
    });

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(404);
  });

  it("returns counts and null userReaction when not logged in", async () => {
    mockAuth.mockResolvedValue(null);
    mockArticleFindFirst.mockResolvedValue(mockArticle);
    mockReactionGroupBy.mockResolvedValue([
      { type: "LIKE", _count: { _all: 5 } },
      { type: "CLAP", _count: { _all: 2 } },
    ]);

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.reactions).toEqual({
      LIKE: 5,
      CLAP: 2,
      INSIGHTFUL: 0,
    });
    expect(data.userReaction).toBeNull();
  });

  it("returns counts and userReaction when logged in", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER", tier: "AFFRANCHI" } });
    mockArticleFindFirst.mockResolvedValue(mockArticle);
    mockReactionGroupBy.mockResolvedValue([]);
    mockReactionFindUnique.mockResolvedValue({
      id: "react-1",
      userId: "user-1",
      articleId: "art-1",
      type: "CLAP",
    });

    const response = await GET(makeRequest("GET"), { params: Promise.resolve({ id: "art-1" }) });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.userReaction).toBe("CLAP");
  });
});

describe("POST /api/articles/[id]/reactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not logged in", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(makeRequest("POST", { type: "LIKE" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 400 if reaction type is invalid", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockArticleFindFirst.mockResolvedValue(mockArticle);

    const response = await POST(makeRequest("POST", { type: "INVALID" }), {
      params: Promise.resolve({ id: "art-1" }),
    });
    expect(response.status).toBe(400);
  });

  it("adds new reaction when none exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER", tier: "AFFRANCHI" } });
    mockArticleFindFirst.mockResolvedValue(mockArticle);
    mockReactionFindUnique.mockResolvedValue(null);
    mockReactionCreate.mockResolvedValue({
      id: "react-1",
      userId: "user-1",
      articleId: "art-1",
      type: "LIKE",
    });

    const response = await POST(makeRequest("POST", { type: "LIKE" }), {
      params: Promise.resolve({ id: "art-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.action).toBe("added");
    expect(data.type).toBe("LIKE");
    expect(mockReactionCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        articleId: "art-1",
        type: "LIKE",
      },
    });
  });

  it("toggles (removes) reaction when same type is clicked again", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER", tier: "AFFRANCHI" } });
    mockArticleFindFirst.mockResolvedValue(mockArticle);
    mockReactionFindUnique.mockResolvedValue({
      id: "react-1",
      userId: "user-1",
      articleId: "art-1",
      type: "LIKE",
    });

    const response = await POST(makeRequest("POST", { type: "LIKE" }), {
      params: Promise.resolve({ id: "art-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.action).toBe("removed");
    expect(mockReactionDelete).toHaveBeenCalledWith({
      where: { id: "react-1" },
    });
  });

  it("updates reaction type when a different reaction is clicked", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER", tier: "AFFRANCHI" } });
    mockArticleFindFirst.mockResolvedValue(mockArticle);
    mockReactionFindUnique.mockResolvedValue({
      id: "react-1",
      userId: "user-1",
      articleId: "art-1",
      type: "LIKE",
    });
    mockReactionUpdate.mockResolvedValue({
      id: "react-1",
      userId: "user-1",
      articleId: "art-1",
      type: "CLAP",
    });

    const response = await POST(makeRequest("POST", { type: "CLAP" }), {
      params: Promise.resolve({ id: "art-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.action).toBe("updated");
    expect(data.type).toBe("CLAP");
    expect(mockReactionUpdate).toHaveBeenCalledWith({
      where: { id: "react-1" },
      data: { type: "CLAP" },
    });
  });
});

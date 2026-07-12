import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminArticlesPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockArticleFindMany = vi.hoisted(() => vi.fn());
const mockArticleCount = vi.hoisted(() => vi.fn());
const mockPromoteConfiguredAdminUser = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findMany: mockArticleFindMany,
      count: mockArticleCount,
    },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));
vi.mock("@/lib/admin-access", () => ({
  promoteConfiguredAdminUser: mockPromoteConfiguredAdminUser,
}));
vi.mock("@/components/features/admin/articles-list-table", () => ({
  default: ({ articles }: { articles: any[] }) => (
    <div data-testid="articles-table">Articles Count: {articles.length}</div>
  ),
}));

mockPromoteConfiguredAdminUser.mockImplementation(async (userId: string) => {
  const session = await mockAuth();
  if (session?.user?.id === userId) {
    return { id: userId, role: session.user.role };
  }
  return null;
});

const mockArticlesFixture = [
  {
    id: "art-1",
    title: "Article 1",
    slug: "article-1",
    excerpt: "Excerpt 1",
    category: "investment",
    visibility: "PUBLIC",
    published: true,
    createdAt: new Date("2026-06-01T12:00:00Z"),
    updatedAt: new Date("2026-06-01T12:00:00Z"),
    publishedAt: new Date("2026-06-01T12:00:00Z"),
    author: { name: "Author 1" },
    opportunity: null,
  },
];

describe("AdminArticlesPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockPromoteConfiguredAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  });

  it("redirects unauthenticated visitors to sign-in", async () => {
    mockAuth.mockResolvedValueOnce(null);

    await expect(AdminArticlesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/auth/signin");
  });

  it("redirects non-admin users to dashboard", async () => {
    mockPromoteConfiguredAdminUser.mockResolvedValueOnce({ id: "admin-1", role: "MEMBER" });

    await expect(AdminArticlesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/dashboard");
  });

  it("renders page header and articles table", async () => {
    mockArticleFindMany.mockResolvedValueOnce(mockArticlesFixture);
    mockArticleCount.mockResolvedValueOnce(1);

    render(await AdminArticlesPage({ searchParams: Promise.resolve({ page: "1" }) }));

    expect(screen.getByRole("heading", { name: "Gestion des Articles" })).toBeInTheDocument();
    expect(screen.getByTestId("articles-table")).toHaveTextContent("Articles Count: 1");
  });

  it("handles pagination parameters and renders page links", async () => {
    // Generate 20 items to satisfy limit
    const items = Array.from({ length: 20 }, (_, i) => ({
      ...mockArticlesFixture[0],
      id: `art-${i}`,
    }));
    mockArticleFindMany.mockResolvedValueOnce(items);
    mockArticleCount.mockResolvedValueOnce(25); // 2 pages total

    render(await AdminArticlesPage({ searchParams: Promise.resolve({ page: "2" }) }));

    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
      })
    );
    expect(screen.getByText("Page 2 / 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Page précédente" })).toHaveAttribute("href", "/admin/articles?page=1");
    expect(screen.queryByRole("link", { name: "Page suivante" })).not.toBeInTheDocument();
  });
});

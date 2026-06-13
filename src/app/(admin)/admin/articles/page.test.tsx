import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminArticlesPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockArticleFindMany = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    article: { findMany: mockArticleFindMany },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));
vi.mock("@/components/features/admin/articles-list-table", () => ({
  default: ({ articles }: { articles: any[] }) => (
    <div data-testid="articles-list-table">Articles Count: {articles.length}</div>
  ),
}));

describe("AdminArticlesPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockArticleFindMany.mockResolvedValue([
      {
        id: "art-1",
        title: "Introduction à la Finance",
        slug: "intro-finance",
        excerpt: "Bases de la finance",
        content: "Contenu complet",
        category: "conseil",
        visibility: "PUBLIC",
        published: true,
        createdAt: new Date("2026-06-11T12:00:00Z"),
        updatedAt: new Date("2026-06-11T12:00:00Z"),
        publishedAt: new Date("2026-06-11T12:00:00Z"),
        authorId: "admin-1",
        author: { name: "Jonathan" },
      },
    ]);
  });

  it("redirects unauthenticated visitors to sign-in", async () => {
    mockAuth.mockResolvedValueOnce(null);

    await expect(AdminArticlesPage()).rejects.toThrow("redirect:/auth/signin");
  });

  it("redirects non-admin users to the dashboard", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "member-1", role: "MEMBER" });

    await expect(AdminArticlesPage()).rejects.toThrow("redirect:/dashboard");
  });

  it("renders page title and articles list table", async () => {
    render(await AdminArticlesPage());

    expect(screen.getByRole("heading", { name: "Gestion des Articles" })).toBeInTheDocument();
    expect(screen.getByTestId("articles-list-table")).toBeInTheDocument();
    expect(screen.getByText("Articles Count: 1")).toBeInTheDocument();
  });
});

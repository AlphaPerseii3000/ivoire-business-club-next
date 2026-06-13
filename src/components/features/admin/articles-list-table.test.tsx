import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleVisibility } from "@/lib/validations";
import ArticlesListTable from "./articles-list-table";

const mockRefresh = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

const mockArticles = [
  {
    id: "art-1",
    title: "Article 1",
    slug: "article-1",
    excerpt: "Description de l'article 1",
    category: "conseil",
    visibility: ArticleVisibility.PUBLIC,
    published: false,
    createdAt: "2026-06-11T12:00:00.000Z",
  },
  {
    id: "art-2",
    title: "Article 2",
    slug: "article-2",
    excerpt: "Description de l'article 2",
    category: "guide",
    visibility: ArticleVisibility.AFFRANCHI,
    published: true,
    createdAt: "2026-06-12T14:00:00.000Z",
  },
];

describe("ArticlesListTable Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { ok: true } }),
    }) as typeof fetch;
  });

  it("renders articles list with appropriate columns", () => {
    render(<ArticlesListTable articles={mockArticles} />);

    expect(screen.getByText("Article 1")).toBeInTheDocument();
    expect(screen.getByText("Article 2")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("Affranchi")).toBeInTheDocument();
    expect(screen.getByText("Brouillon")).toBeInTheDocument();
    expect(screen.getByText("Publié")).toBeInTheDocument();
  });

  it("triggers publish fetch request when clicking Publier", async () => {
    const user = userEvent.setup();
    render(<ArticlesListTable articles={mockArticles} />);

    const publishBtn = screen.getByTestId("publish-btn-art-1");
    await user.click(publishBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/articles/art-1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ published: true }),
        })
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Article publié avec succès.");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("triggers unpublish fetch request when clicking Dépublier", async () => {
    const user = userEvent.setup();
    render(<ArticlesListTable articles={mockArticles} />);

    const unpublishBtn = screen.getByTestId("publish-btn-art-2");
    await user.click(unpublishBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/articles/art-2",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ published: false }),
        })
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Article retiré de la publication.");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("opens delete confirmation modal and makes DELETE request upon confirmation", async () => {
    const user = userEvent.setup();
    render(<ArticlesListTable articles={mockArticles} />);

    // Click delete button
    const deleteBtn = screen.getByTestId("delete-btn-art-1");
    await user.click(deleteBtn);

    // Dialog title should appear
    expect(screen.getByRole("heading", { name: "Confirmer la suppression" })).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Article 1/)).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByTestId("confirm-delete-btn");
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/articles/art-1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Article supprimé avec succès.");
    expect(mockRefresh).toHaveBeenCalled();
  });
});

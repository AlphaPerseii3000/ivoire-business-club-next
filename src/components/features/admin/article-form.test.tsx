import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleVisibility } from "@/lib/validations";
import ArticleForm from "./article-form";

const mockPush = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

describe("ArticleForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "new-art-1" }),
    }) as typeof fetch;
  });

  it("submits the form successfully with valid inputs (creation mode)", async () => {
    const user = userEvent.setup();
    render(<ArticleForm initialData={null} />);

    // Fill fields
    const titleInput = screen.getByTestId("article-title-input");
    const excerptInput = screen.getByTestId("article-excerpt-input");
    const contentInput = screen.getByTestId("article-content-input");

    await user.type(titleInput, "Titre de l'article de test");
    await user.type(excerptInput, "Résumé de l'article de test avec plus de dix caractères");
    await user.type(contentInput, "Le contenu de test de l'article doit être long également.");

    // Submit form
    const submitBtn = screen.getByTestId("article-submit-button");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/articles",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "Titre de l'article de test",
            excerpt: "Résumé de l'article de test avec plus de dix caractères",
            content: "Le contenu de test de l'article doit être long également.",
            category: "conseil",
            visibility: ArticleVisibility.PUBLIC,
            imageUrl: null,
            opportunityId: null,
          }),
        })
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Article créé avec succès en tant que brouillon."
    );
    expect(mockPush).toHaveBeenCalledWith("/admin/articles");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("submits custom category correctly", async () => {
    const user = userEvent.setup();
    render(<ArticleForm initialData={null} />);

    await user.type(screen.getByTestId("article-title-input"), "Titre article");
    await user.type(screen.getByTestId("article-excerpt-input"), "Résumé article long");
    await user.type(screen.getByTestId("article-content-input"), "Contenu article long");

    // Click Category trigger and select custom category
    // Base UI uses select trigger and option items
    // In our test, we can set the Select value directly or simulate click
    // Note: base-ui uses standard select elements underneath or native trigger. Let's select it:
    const categoryTrigger = screen.getByTestId("article-category-trigger");
    await user.click(categoryTrigger);

    const customOption = await screen.findByRole("option", { name: "Autre (personnalisé)..." });
    await user.click(customOption);

    // Custom category input should show up
    const customInput = await screen.findByTestId("article-custom-category-input");
    await user.type(customInput, "crypto");

    const submitBtn = screen.getByTestId("article-submit-button");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/articles",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"category":"crypto"'),
        })
      );
    });
  });

  it("submits changes in edit mode with prefilled values", async () => {
    const user = userEvent.setup();
    const initialData = {
      id: "art-existing",
      title: "Mon Titre Existant",
      excerpt: "Un résumé long pré-rempli",
      content: "Un contenu de test pré-rempli",
      category: "guide",
      visibility: ArticleVisibility.GRAND_FRERE,
      published: true,
    };

    render(<ArticleForm initialData={initialData} />);

    expect(screen.getByTestId("article-title-input")).toHaveValue("Mon Titre Existant");

    // Change title
    await user.clear(screen.getByTestId("article-title-input"));
    await user.type(screen.getByTestId("article-title-input"), "Nouveau Titre Modifie");

    // Click submit
    await user.click(screen.getByTestId("article-submit-button"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/articles/art-existing",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            title: "Nouveau Titre Modifie",
            excerpt: "Un résumé long pré-rempli",
            content: "Un contenu de test pré-rempli",
            category: "guide",
            visibility: ArticleVisibility.GRAND_FRERE,
            imageUrl: null,
            opportunityId: null,
            published: true,
          }),
        })
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith("Article modifié avec succès.");
    expect(mockPush).toHaveBeenCalledWith("/admin/articles");
  });

  it("shows validation errors for invalid inputs", async () => {
    const user = userEvent.setup();
    render(<ArticleForm initialData={null} />);

    // Short title and excerpt
    await user.type(screen.getByTestId("article-title-input"), "ab");
    await user.type(screen.getByTestId("article-excerpt-input"), "short");

    await user.click(screen.getByTestId("article-submit-button"));

    expect(await screen.findByText("Le titre doit contenir au moins 3 caractères")).toBeInTheDocument();
    expect(await screen.findByText("Le résumé doit contenir au moins 10 caractères")).toBeInTheDocument();
  });

  it("renders opportunity selector and submits selected opportunityId", async () => {
    const user = userEvent.setup();
    const opportunities = [
      { id: "opp-1", title: "Opportunité Immobilière Abidjan" },
      { id: "opp-2", title: "Projet Solaire Korhogo" },
    ];

    render(<ArticleForm initialData={null} opportunities={opportunities} />);

    // Fill fields
    await user.type(screen.getByTestId("article-title-input"), "Titre article");
    await user.type(screen.getByTestId("article-excerpt-input"), "Résumé article long");
    await user.type(screen.getByTestId("article-content-input"), "Contenu article long");

    // Click Opportunity trigger and select Proj Solaire
    const oppTrigger = screen.getByTestId("article-opportunity-trigger");
    await user.click(oppTrigger);

    const option = await screen.findByRole("option", { name: "Projet Solaire Korhogo" });
    await user.click(option);

    const submitBtn = screen.getByTestId("article-submit-button");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/articles",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"opportunityId":"opp-2"'),
        })
      );
    });
  });

  it("inserts markdown syntax correctly using toolbar buttons", async () => {
    const user = userEvent.setup();
    render(<ArticleForm initialData={null} />);

    const contentInput = screen.getByTestId("article-content-input") as HTMLTextAreaElement;
    await user.type(contentInput, "Hello");

    // Click bold button
    const boldBtn = screen.getByTestId("markdown-bold-btn");
    await user.click(boldBtn);

    expect(contentInput.value).toContain("**texte**");

    // Select "Hello" and click bold button
    contentInput.setSelectionRange(0, 5);
    await user.click(boldBtn);
    expect(contentInput.value).toContain("**Hello**");
  });

  it("renders markdown preview correctly when switching tabs", async () => {
    const user = userEvent.setup();
    render(<ArticleForm initialData={null} />);

    const contentInput = screen.getByTestId("article-content-input");
    await user.type(contentInput, "Hello **World**");

    // Click preview tab
    const previewTrigger = screen.getByTestId("markdown-preview-trigger");
    await user.click(previewTrigger);

    const previewContainer = screen.getByTestId("markdown-preview");
    expect(previewContainer).toBeInTheDocument();
    expect(previewContainer.innerHTML).toContain("<strong>World</strong>");
  });
});

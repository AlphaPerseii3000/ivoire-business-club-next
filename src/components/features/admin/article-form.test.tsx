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

/**
 * Helper to set TipTap editor content directly via its ProseMirror DOM.
 * Instead of simulating every keystroke (which is slow in jsdom), we set the
 * text content and dispatch an input event so the Markdown extension serializes
 * the value back into react-hook-form.
 */
async function setEditorMarkdown(container: HTMLElement, markdown: string) {
  const proseMirror = container.querySelector(".ProseMirror");
  if (!proseMirror) throw new Error("ProseMirror editor not found");

  const editorElement = proseMirror as HTMLElement;
  editorElement.textContent = markdown;

  // Dispatch input event to trigger TipTap's update cycle
  const inputEvent = new Event("input", { bubbles: true, cancelable: true });
  editorElement.dispatchEvent(inputEvent);

  // Allow ProseMirror's DOM observer to process the change and serialize it
  await new Promise((resolve) => setTimeout(resolve, 150));
}

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
    const { container } = render(<ArticleForm initialData={null} />);

    await user.type(screen.getByTestId("article-title-input"), "Titre de l'article de test");
    await user.type(screen.getByTestId("article-excerpt-input"), "Résumé de l'article de test avec plus de dix caractères");
    await setEditorMarkdown(container, "Le contenu de test de l'article doit être long également.");

    await user.click(screen.getByTestId("article-submit-button"));

    await waitFor(
      () => {
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
      },
      { timeout: 10000 }
    );

    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Article créé avec succès en tant que brouillon."
    );
    expect(mockPush).toHaveBeenCalledWith("/admin/articles");
    expect(mockRefresh).toHaveBeenCalled();
  }, 15000);

  it("submits custom category correctly", async () => {
    const user = userEvent.setup();
    const { container } = render(<ArticleForm initialData={null} />);

    await user.type(screen.getByTestId("article-title-input"), "Titre article");
    await user.type(screen.getByTestId("article-excerpt-input"), "Résumé article long");
    await setEditorMarkdown(container, "Contenu article long");

    const categoryTrigger = screen.getByTestId("article-category-trigger");
    await user.click(categoryTrigger);

    const customOption = await screen.findByRole("option", { name: "Autre (personnalisé)..." });
    await user.click(customOption);

    const customInput = await screen.findByTestId("article-custom-category-input");
    await user.type(customInput, "crypto");

    await user.click(screen.getByTestId("article-submit-button"));

    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/articles",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"category":"crypto"'),
          })
        );
      },
      { timeout: 10000 }
    );
  }, 15000);

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

    await user.clear(screen.getByTestId("article-title-input"));
    await user.type(screen.getByTestId("article-title-input"), "Nouveau Titre Modifie");

    await user.click(screen.getByTestId("article-submit-button"));

    await waitFor(
      () => {
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
      },
      { timeout: 10000 }
    );

    expect(mockToastSuccess).toHaveBeenCalledWith("Article modifié avec succès.");
    expect(mockPush).toHaveBeenCalledWith("/admin/articles");
  }, 15000);

  it("shows validation errors for invalid inputs", async () => {
    const user = userEvent.setup();
    render(<ArticleForm initialData={null} />);

    await user.type(screen.getByTestId("article-title-input"), "ab");
    await user.type(screen.getByTestId("article-excerpt-input"), "short");

    await user.click(screen.getByTestId("article-submit-button"));

    expect(await screen.findByText("Le titre doit contenir au moins 3 caractères")).toBeInTheDocument();
    expect(await screen.findByText("Le résumé doit contenir au moins 10 caractères")).toBeInTheDocument();
  }, 15000);

  it("renders opportunity selector and submits selected opportunityId", async () => {
    const user = userEvent.setup();
    const opportunities = [
      { id: "opp-1", title: "Opportunité Immobilière Abidjan" },
      { id: "opp-2", title: "Projet Solaire Korhogo" },
    ];

    const { container } = render(<ArticleForm initialData={null} opportunities={opportunities} />);

    await user.type(screen.getByTestId("article-title-input"), "Titre article");
    await user.type(screen.getByTestId("article-excerpt-input"), "Résumé article long");
    await setEditorMarkdown(container, "Contenu article long");

    const oppTrigger = screen.getByTestId("article-opportunity-trigger");
    await user.click(oppTrigger);

    const option = await screen.findByRole("option", { name: "Projet Solaire Korhogo" });
    await user.click(option);

    await user.click(screen.getByTestId("article-submit-button"));

    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/articles",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"opportunityId":"opp-2"'),
          })
        );
      },
      { timeout: 10000 }
    );
  }, 15000);

  it("serializes markdown content from TipTap editor", async () => {
    const user = userEvent.setup();
    const { container } = render(<ArticleForm initialData={null} />);

    // Set markdown content via the ProseMirror DOM and trigger serialization
    await setEditorMarkdown(container, "Contenu avec du **gras** et de l'*italique*.");

    await user.type(screen.getByTestId("article-title-input"), "Titre article");
    await user.type(screen.getByTestId("article-excerpt-input"), "Résumé article long");

    await user.click(screen.getByTestId("article-submit-button"));

    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/articles",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"content":'),
          })
        );
      },
      { timeout: 10000 }
    );
  }, 15000);
});
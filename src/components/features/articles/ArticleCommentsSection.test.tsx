import React, { act } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleCommentsSection } from "./ArticleCommentsSection";

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const mockComment1 = {
  id: "com-1",
  content: "Premier commentaire",
  createdAt: "2026-06-16T12:00:00Z",
  updatedAt: "2026-06-16T12:00:00Z",
  articleId: "art-1",
  userId: "user-1",
  user: {
    id: "user-1",
    name: "Jean Dupont",
    image: "/avatars/jean.png",
  },
};

const mockComment2 = {
  id: "com-2",
  content: "Deuxième commentaire",
  createdAt: "2026-06-17T10:30:00Z",
  updatedAt: "2026-06-17T10:30:00Z",
  articleId: "art-1",
  userId: "user-2",
  user: {
    id: "user-2",
    name: null,
    image: null,
  },
};

function setupFetch(mockResponse: { ok: boolean; status: number; json: unknown }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: mockResponse.ok,
    status: mockResponse.status,
    json: () => Promise.resolve(mockResponse.json),
  });
}

function setupFetchOnce(mockResponse: { ok: boolean; status: number; json: unknown }) {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: mockResponse.ok,
    status: mockResponse.status,
    json: () => Promise.resolve(mockResponse.json),
  });
}

function setupFetchSequence(responses: Array<{ ok: boolean; status: number; json: unknown }>) {
  global.fetch = vi.fn();
  for (const response of responses) {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: response.ok,
      status: response.status,
      json: () => Promise.resolve(response.json),
    });
  }
}

describe("ArticleCommentsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders membership CTA when user is not authorized", () => {
    render(
      <ArticleCommentsSection articleId="art-1" isAuthorized={false} />
    );

    expect(screen.getByTestId("comments-guest-cta")).toBeInTheDocument();
    expect(screen.getByText("Devenez membre actif pour consulter et participer aux discussions.")).toBeInTheDocument();
    expect(screen.getByText("Voir les abonnements")).toBeInTheDocument();
  });

  it("displays loading state then renders comment list", async () => {
    setupFetch({ ok: true, status: 200, json: { comments: [mockComment1, mockComment2] } });

    render(<ArticleCommentsSection articleId="art-1" isAuthorized={true} userId="user-3" />);

    expect(screen.getByTestId("comments-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("comments-loading")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("comments-list")).toBeInTheDocument();
    expect(screen.getByTestId("comment-com-1")).toBeInTheDocument();
    expect(screen.getByTestId("comment-com-2")).toBeInTheDocument();
    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("Premier commentaire")).toBeInTheDocument();
    expect(screen.getByText("Deuxième commentaire")).toBeInTheDocument();
  });

  it("renders empty state when there are no comments", async () => {
    setupFetch({ ok: true, status: 200, json: { comments: [] } });

    render(<ArticleCommentsSection articleId="art-1" isAuthorized={true} userId="user-3" />);

    await waitFor(() => {
      expect(screen.queryByTestId("comments-loading")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Aucun commentaire")).toBeInTheDocument();
    expect(screen.getByText("Soyez le premier à partager votre avis sur cet article.")).toBeInTheDocument();
  });

  it("renders retry UI on API error", async () => {
    setupFetch({ ok: false, status: 500, json: { error: "Erreur interne" } });

    render(<ArticleCommentsSection articleId="art-1" isAuthorized={true} userId="user-3" />);

    await waitFor(() => {
      expect(screen.queryByTestId("comments-loading")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Impossible de charger les commentaires. Veuillez réessayer.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Réessayer/i })).toBeInTheDocument();
  });

  it("submits a valid comment and updates the list optimistically", async () => {
    const user = userEvent.setup();
    const newComment = {
      ...mockComment1,
      id: "com-new",
      content: "Nouveau commentaire",
    };

    setupFetchSequence([
      { ok: true, status: 200, json: { comments: [mockComment2] } },
      { ok: true, status: 201, json: newComment },
    ]);

    render(<ArticleCommentsSection articleId="art-1" isAuthorized={true} userId="user-3" />);

    await waitFor(() => {
      expect(screen.queryByTestId("comments-loading")).not.toBeInTheDocument();
    });

    const textarea = screen.getByTestId("comment-textarea");
    const submitButton = screen.getByTestId("comment-submit-button");

    await act(async () => {
      await user.type(textarea, "Nouveau commentaire");
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Nouveau commentaire")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenLastCalledWith(
      "/api/articles/art-1/comments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "Nouveau commentaire" }),
      })
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("Commentaire publié.");
    expect(textarea).toHaveValue("");
  });

  it("shows validation error for short comments", async () => {
    const user = userEvent.setup();
    setupFetch({ ok: true, status: 200, json: { comments: [] } });

    render(<ArticleCommentsSection articleId="art-1" isAuthorized={true} userId="user-3" />);

    await waitFor(() => {
      expect(screen.queryByTestId("comments-loading")).not.toBeInTheDocument();
    });

    const textarea = screen.getByTestId("comment-textarea");
    const submitButton = screen.getByTestId("comment-submit-button");

    await act(async () => {
      await user.type(textarea, "a");
      await user.click(submitButton);
    });

    expect(screen.getByTestId("comment-validation-error")).toHaveTextContent(
      "Le commentaire doit contenir au moins 2 caractères."
    );
    expect(global.fetch).toHaveBeenCalledTimes(1); // only initial load
  });

  it("shows validation error for comments exceeding max length", async () => {
    setupFetch({ ok: true, status: 200, json: { comments: [] } });

    render(<ArticleCommentsSection articleId="art-1" isAuthorized={true} userId="user-3" />);

    await waitFor(() => {
      expect(screen.queryByTestId("comments-loading")).not.toBeInTheDocument();
    });

    const textarea = screen.getByTestId("comment-textarea");
    const longContent = "a".repeat(1001);

    fireEvent.change(textarea, { target: { value: longContent } });

    expect(screen.getByTestId("comment-char-count")).toHaveTextContent("1001 / 1000");

    const submitButton = screen.getByTestId("comment-submit-button");
    expect(submitButton).toBeDisabled();

    expect(screen.getByTestId("comment-validation-error")).toHaveTextContent(
      "Le commentaire ne doit pas dépasser 1000 caractères."
    );
  });

  it("disables submit button when no valid content", async () => {
    setupFetch({ ok: true, status: 200, json: { comments: [] } });

    render(<ArticleCommentsSection articleId="art-1" isAuthorized={true} userId="user-3" />);

    await waitFor(() => {
      expect(screen.queryByTestId("comments-loading")).not.toBeInTheDocument();
    });

    const submitButton = screen.getByTestId("comment-submit-button");
    expect(submitButton).toBeDisabled();
  });

  it("displays submitting state while posting", async () => {
    const user = userEvent.setup();
    let resolvePost: (value: Response) => void = () => {};

    global.fetch = vi.fn().mockImplementation((url: string | URL, init: RequestInit | undefined) => {
      if (init?.method === "POST") {
        return new Promise<Response>((resolve) => {
          resolvePost = resolve;
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ comments: [] }),
      });
    });

    render(<ArticleCommentsSection articleId="art-1" isAuthorized={true} userId="user-3" />);

    await waitFor(() => {
      expect(screen.queryByTestId("comments-loading")).not.toBeInTheDocument();
    });

    const textarea = screen.getByTestId("comment-textarea");
    const submitButton = screen.getByTestId("comment-submit-button");

    await act(async () => {
      await user.type(textarea, "Mon commentaire");
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId("comment-submit-button")).toHaveTextContent("Envoi en cours...");
    });

    expect(submitButton).toBeDisabled();

    resolvePost(new Response(JSON.stringify({ id: "com-3", content: "Mon commentaire", user: { id: "user-3", name: "Test", image: null }, createdAt: "2026-06-18T10:00:00Z", updatedAt: "2026-06-18T10:00:00Z", articleId: "art-1", userId: "user-3" }), { status: 201 }));

    await waitFor(() => {
      expect(screen.getByText("Mon commentaire")).toBeInTheDocument();
    });
  });

  it("shows login CTA instead of form when userId is not provided", async () => {
    setupFetch({ ok: true, status: 200, json: { comments: [mockComment1] } });

    render(<ArticleCommentsSection articleId="art-1" isAuthorized={true} />);

    await waitFor(() => {
      expect(screen.queryByTestId("comments-loading")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("comments-login-cta")).toBeInTheDocument();
    expect(screen.queryByTestId("comment-form")).not.toBeInTheDocument();
  });

  it("handles server validation error on submit", async () => {
    const user = userEvent.setup();

    setupFetchSequence([
      { ok: true, status: 200, json: { comments: [] } },
      { ok: false, status: 400, json: { error: "Le commentaire est trop court" } },
    ]);

    render(<ArticleCommentsSection articleId="art-1" isAuthorized={true} userId="user-3" />);

    await waitFor(() => {
      expect(screen.queryByTestId("comments-loading")).not.toBeInTheDocument();
    });

    const textarea = screen.getByTestId("comment-textarea");
    const submitButton = screen.getByTestId("comment-submit-button");

    await act(async () => {
      await user.type(textarea, "ab");
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Le commentaire est trop court");
    });
  });

  it("reuses avatar fallback when user has no image", async () => {
    setupFetch({ ok: true, status: 200, json: { comments: [mockComment2] } });

    render(<ArticleCommentsSection articleId="art-1" isAuthorized={true} userId="user-3" />);

    await waitFor(() => {
      expect(screen.queryByTestId("comments-loading")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Membre")).toBeInTheDocument();
  });

  it("can retry after a failed load", async () => {
    const user = userEvent.setup();
    setupFetchSequence([
      { ok: false, status: 500, json: { error: "Erreur interne" } },
      { ok: true, status: 200, json: { comments: [mockComment1] } },
    ]);

    render(<ArticleCommentsSection articleId="art-1" isAuthorized={true} userId="user-3" />);

    await waitFor(() => {
      expect(screen.getByText("Impossible de charger les commentaires. Veuillez réessayer.")).toBeInTheDocument();
    });

    const retryButton = screen.getByRole("button", { name: /Réessayer/i });
    await act(async () => {
      await user.click(retryButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Premier commentaire")).toBeInTheDocument();
    });
  });
});

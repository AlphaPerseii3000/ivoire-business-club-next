import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BetaChatWidget from "./beta-chat-widget";

const mockUseSession = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({
  useSession: mockUseSession,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderWidget() {
  return render(<BetaChatWidget />);
}

describe("BetaChatWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
      status: "authenticated",
    });
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { unreadCount: 0 } }),
    });
  });

  it("n'affiche pas le widget pour un utilisateur non authentifié", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    const { container } = renderWidget();
    expect(container.firstChild).toBeNull();
  });

  it("affiche le bouton flottant pour un membre authentifié", () => {
    renderWidget();
    expect(
      screen.getByRole("button", { name: /ouvrir le chat de support bêta/i })
    ).toBeInTheDocument();
  });

  it("affiche le badge rouge quand des messages non lus existent", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { unreadCount: 3 } }),
    });
    renderWidget();

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("ouvre le panneau et affiche la bannière bêta", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { unreadCount: 0 } }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { messages: [], total: 0, page: 1, limit: 50 },
      }),
    });

    const user = userEvent.setup();
    renderWidget();

    await user.click(
      screen.getByRole("button", { name: /ouvrir le chat de support bêta/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/plateforme en phase bêta/i)
      ).toBeInTheDocument();
    });
  });

  it("charge et affiche l'historique des messages", async () => {
    const messages = [
      {
        id: "msg-1",
        userId: "user-1",
        author: "MEMBER",
        category: "bug_technique",
        content: "Problème de connexion",
        createdAt: "2026-06-29T08:00:00.000Z",
      },
      {
        id: "ack-1",
        userId: "user-1",
        author: "SYSTEM",
        content: "Merci, votre message a été reçu.",
        createdAt: "2026-06-29T08:00:01.000Z",
      },
      {
        id: "reply-1",
        userId: "user-1",
        author: "HERMES",
        content: "Nous regardons cela rapidement.",
        createdAt: "2026-06-29T08:05:00.000Z",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { unreadCount: 0 } }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { messages, total: messages.length, page: 1, limit: 50 },
      }),
    });

    const user = userEvent.setup();
    renderWidget();

    await user.click(
      screen.getByRole("button", { name: /ouvrir le chat de support bêta/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Problème de connexion")).toBeInTheDocument();
    });

    expect(screen.getByText("Vous")).toBeInTheDocument();
    expect(screen.getByText("Système")).toBeInTheDocument();
    expect(screen.getByText("Équipe IBC")).toBeInTheDocument();
  });

  it("affiche le statut en ligne quand une réponse HERMES date de moins de 30 min", async () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { unreadCount: 0 } }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          messages: [
            {
              id: "reply-1",
              userId: "user-1",
              author: "HERMES",
              content: "Réponse récente",
              createdAt: recent,
            },
          ],
          total: 1,
          page: 1,
          limit: 50,
        },
      }),
    });

    const user = userEvent.setup();
    renderWidget();
    await user.click(
      screen.getByRole("button", { name: /ouvrir le chat de support bêta/i })
    );

    await waitFor(() => {
      expect(screen.getByText("En ligne")).toBeInTheDocument();
    });
  });

  it("affiche le statut hors ligne par défaut", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { unreadCount: 0 } }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { messages: [], total: 0, page: 1, limit: 50 },
      }),
    });

    const user = userEvent.setup();
    renderWidget();
    await user.click(
      screen.getByRole("button", { name: /ouvrir le chat de support bêta/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Hors ligne")).toBeInTheDocument();
    });
  });

  it("soumet le formulaire et affiche le message plus l'accusé de réception", async () => {
    const messages = [
      {
        id: "msg-2",
        userId: "user-1",
        author: "MEMBER",
        category: "accessibilite",
        content: "Remarque accessibilité",
        createdAt: "2026-06-29T09:00:00.000Z",
      },
      {
        id: "ack-2",
        userId: "user-1",
        author: "SYSTEM",
        content: "Merci, votre message a été reçu.",
        createdAt: "2026-06-29T09:00:01.000Z",
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { unreadCount: 0 } }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { messages: [], total: 0, page: 1, limit: 50 },
      }),
    });
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/chat/messages") {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            data: {
              message: messages[0],
              ack: messages[1],
            },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: { unreadCount: 0 } }),
      });
    });

    const user = userEvent.setup();
    renderWidget();
    await user.click(
      screen.getByRole("button", { name: /ouvrir le chat de support bêta/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/plateforme en phase bêta/i)).toBeInTheDocument();
    });

    const categoryButton = screen.getByRole("radio", { name: /accessibilité/i });
    await user.click(categoryButton);

    const textarea = screen.getByPlaceholderText(/décrivez votre bug/i);
    await user.type(textarea, "Remarque accessibilité");

    await user.click(screen.getByRole("button", { name: /envoyer/i }));

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const postCall = calls.find((call) => call[0] === "/api/chat/messages");
      expect(postCall).toBeDefined();
      expect(postCall![0]).toBe("/api/chat/messages");
      expect(postCall![1]).toEqual(
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            category: "accessibilite",
            content: "Remarque accessibilité",
          }),
        })
      );
    });

    // After the POST, the component immediately inserts the returned messages into the local history.
    await waitFor(() => {
      expect(
        screen.getByText((content) => content.includes("Remarque accessibilité"))
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Accusé de réception")).toBeInTheDocument();
  });

  it("respecte la limite de 5000 caractères et affiche le compteur", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { unreadCount: 0 } }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { messages: [], total: 0, page: 1, limit: 50 },
      }),
    });

    const user = userEvent.setup();
    renderWidget();
    await user.click(
      screen.getByRole("button", { name: /ouvrir le chat de support bêta/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/plateforme en phase bêta/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/décrivez votre bug/i);
    fireEvent.change(textarea, { target: { value: "a".repeat(5001) } });

    await waitFor(() => {
      expect(screen.getByText("5001/5000")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled();
  }, 10000);
});

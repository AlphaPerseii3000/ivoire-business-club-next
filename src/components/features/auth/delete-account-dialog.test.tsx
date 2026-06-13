import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteAccountDialog from "./delete-account-dialog";

const mockSignOut = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({
  signOut: mockSignOut,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper: find a button by its text content
function getButtonByText(text: string | RegExp) {
  const allButtons = screen.getAllByRole("button");
  return allButtons.find(b => {
    const content = b.textContent ?? "";
    if (typeof text === "string") return content.includes(text);
    return text.test(content);
  })!;
}

describe("DeleteAccountDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the delete account button", () => {
    render(<DeleteAccountDialog />);
    expect(getButtonByText("Supprimer mon compte")).toBeTruthy();
  });

  it("opens dialog when clicking the delete button", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountDialog />);

    await user.click(getButtonByText("Supprimer mon compte"));

    await waitFor(() => {
      expect(screen.getByText(/cette action est irréversible/i)).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("SUPPRIMER")).toBeInTheDocument();
  });

  it("confirm button is disabled when confirmation text is not SUPPRIMER", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountDialog />);

    await user.click(getButtonByText("Supprimer mon compte"));

    const input = await screen.findByPlaceholderText("SUPPRIMER");
    const confirmButton = getButtonByText(/supprimer définitivement/i);

    expect(confirmButton).toBeDisabled();

    await user.type(input, "delete");
    expect(confirmButton).toBeDisabled();
  });

  it("typing SUPPRIMER enables the confirm button", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountDialog />);

    await user.click(getButtonByText("Supprimer mon compte"));

    const input = await screen.findByPlaceholderText("SUPPRIMER");
    const confirmButton = getButtonByText(/supprimer définitivement/i);

    await user.type(input, "SUPPRIMER");
    await waitFor(() => {
      expect(confirmButton).toBeEnabled();
    });
  });

  it("successful deletion calls signOut and redirects", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { message: "Compte supprimé avec succès." } }),
    });
    mockSignOut.mockResolvedValueOnce(undefined);

    render(<DeleteAccountDialog />);

    await user.click(getButtonByText("Supprimer mon compte"));

    const input = await screen.findByPlaceholderText("SUPPRIMER");
    await user.type(input, "SUPPRIMER");

    const confirmButton = getButtonByText(/supprimer définitivement/i);
    await waitFor(() => {
      expect(confirmButton).toBeEnabled();
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/user/account", expect.objectContaining({
        method: "DELETE",
      }));
      expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: "/" });
    });
  });

  it("shows error toast on server error (500)", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Erreur interne" }),
    });

    render(<DeleteAccountDialog />);

    await user.click(getButtonByText("Supprimer mon compte"));

    const input = await screen.findByPlaceholderText("SUPPRIMER");
    await user.type(input, "SUPPRIMER");

    const confirmButton = await waitFor(() => {
      const btns = screen.getAllByRole("button");
      const cb = btns.find(b => b.textContent?.includes("Supprimer définitivement") && !(b as any).disabled);
      if (!cb) throw new Error("Confirm button not found or not enabled");
      return cb;
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Une erreur est survenue. Veuillez réessayer.");
    });
  });

  it("shows inline error on 400 response", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Veuillez taper SUPPRIMER pour confirmer." }),
    });

    render(<DeleteAccountDialog />);

    await user.click(getButtonByText("Supprimer mon compte"));

    const input = await screen.findByPlaceholderText("SUPPRIMER");
    await user.type(input, "SUPPRIMER");

    const confirmButton = await waitFor(() => {
      const btns = screen.getAllByRole("button");
      const cb = btns.find(b => b.textContent?.includes("Supprimer définitivement") && !(b as any).disabled);
      if (!cb) throw new Error("Confirm button not found or not enabled");
      return cb;
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/confirmation incorrecte/i)).toBeInTheDocument();
    });
  });
});
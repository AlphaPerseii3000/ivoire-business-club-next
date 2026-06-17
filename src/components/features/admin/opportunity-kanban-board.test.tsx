import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { AdminOpportunityKanban } from "./opportunity-kanban-board";
import type { AdminOpportunity } from "./opportunity-detail-sheet";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeOpportunity(overrides: Partial<AdminOpportunity> = {}): AdminOpportunity {
  return {
    id: "opp-1",
    title: "Terrain à Cocody",
    description: "Dossier complet avec documents juridiques.",
    category: "IMMOBILIER",
    amount: 25000,
    currency: "XOF",
    requiredTier: "AFFRANCHI",
    verificationStatus: "PENDING",
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
    verifiedAt: null,
    rejectionNote: null,
    reviewNotes: null,
    adminNote: null,
    author: { id: "author-1", name: "Koffi", email: "koffi@example.com", image: null },
    documents: [],
    documentCount: 0,
    requiresDoubleVerification: true,
    approvalCount: 1,
    currentAdminApproved: false,
    ...overrides,
  };
}

const opportunities: AdminOpportunity[] = [makeOpportunity()];

describe("AdminOpportunityKanban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders the four desktop columns and mobile status chips with counters", () => {
    render(<AdminOpportunityKanban opportunities={opportunities} />);

    expect(screen.getAllByText("En attente").length).toBeGreaterThan(0);
    expect(screen.getAllByText("En cours").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vérifié").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Refusé").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "En attente (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "En cours (0)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vérifié (0)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refusé (0)" })).toBeInTheDocument();
    expect(screen.getAllByText("Double vérification requise (1/2)").length).toBeGreaterThan(0);
  });

  it("switches the mobile chip filter and renders the mobile empty state", async () => {
    const user = userEvent.setup();
    render(<AdminOpportunityKanban opportunities={opportunities} />);

    await user.click(screen.getByRole("button", { name: "Vérifié (0)" }));

    expect(screen.getAllByText("Aucun deal vérifié").length).toBeGreaterThan(0);
  });

  it("renders desktop column counters, scrollable card lists, and empty states", () => {
    const manyPending = Array.from({ length: 21 }, (_, index) => makeOpportunity({
      id: `opp-pending-${index}`,
      title: `Deal en attente ${index}`,
      verificationStatus: "PENDING",
      createdAt: `2026-05-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    }));

    render(<AdminOpportunityKanban opportunities={manyPending} />);

    expect(screen.getByTestId("kanban-counter-PENDING")).toHaveTextContent("21");
    expect(screen.getByTestId("kanban-scroll-PENDING")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("kanban-scroll-PENDING").className).toContain("max-h-[calc(100vh-260px)]");
    expect(screen.getAllByText("Aucun deal en cours").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Aucun deal vérifié").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Aucun deal refusé").length).toBeGreaterThan(0);
  });

  it("moves a pending card to EN_COURS and shows a success toast", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: makeOpportunity({ verificationStatus: "EN_COURS", approvalCount: 1 }) }),
    } as Response);

    render(<AdminOpportunityKanban opportunities={opportunities} />);

    await user.click(screen.getAllByRole("button", { name: "En cours" })[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/opportunities/opp-1/verify", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ action: "start_review" }),
      }));
    });
    expect(toast.success).toHaveBeenCalledWith("Statut du deal mis à jour.");
  });

  it("opens the detail sheet and requires a rejection note", async () => {
    const user = userEvent.setup();
    render(<AdminOpportunityKanban opportunities={opportunities} />);

    await user.click(screen.getAllByRole("button", { name: "Détails" })[0]);
    expect(await screen.findByText("Actions de vérification")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rejeter" }));
    expect(await screen.findByText("La note est obligatoire pour refuser un deal.")).toBeInTheDocument();
  });

  it("updates an opportunity from the inline edit form and refreshes local state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: makeOpportunity({ title: "Deal édité", amount: 75000, requiresDoubleVerification: true, requiredTier: "BOSS" }) }),
    } as Response);

    render(<AdminOpportunityKanban opportunities={opportunities} />);

    await user.click(screen.getAllByRole("button", { name: "Détails" })[0]);
    await user.click(await screen.findByRole("button", { name: "Éditer" }));
    await user.clear(screen.getByLabelText("Titre"));
    await user.type(screen.getByLabelText("Titre"), "Deal édité");
    await user.clear(screen.getByLabelText("Montant"));
    await user.type(screen.getByLabelText("Montant"), "75000");
    await user.selectOptions(screen.getByLabelText("Tier requis"), "BOSS");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/opportunities/opp-1", expect.objectContaining({ method: "PATCH" }));
    });
    expect(toast.success).toHaveBeenCalledWith("Opportunité mise à jour.");
    expect(await screen.findAllByText("Deal édité")).not.toHaveLength(0);
  });

  it("keeps the edit form open and shows an error toast when update fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Données invalides" }),
    } as Response);

    render(<AdminOpportunityKanban opportunities={opportunities} />);

    await user.click(screen.getAllByRole("button", { name: "Détails" })[0]);
    await user.click(await screen.findByRole("button", { name: "Éditer" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Données invalides");
    });
    expect(screen.getByLabelText("Titre")).toBeInTheDocument();
  });

  it("deletes an opportunity after explicit confirmation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ok: true } }) } as Response);

    render(<AdminOpportunityKanban opportunities={opportunities} />);

    await user.click(screen.getAllByRole("button", { name: "Détails" })[0]);
    await user.click(await screen.findByRole("button", { name: "Supprimer" }));
    await user.click(await screen.findByRole("button", { name: "Supprimer définitivement" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/opportunities/opp-1", { method: "DELETE" });
    });
    expect(toast.success).toHaveBeenCalledWith("Opportunité supprimée.");
  });

  it("does not delete a document when the document confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const confirmMock = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmMock);
    const docs = [{ id: "doc-1", originalName: "Contrat.pdf", fileName: "doc.pdf", mimeType: "application/pdf", size: 1200 }];

    render(<AdminOpportunityKanban opportunities={[makeOpportunity({ documents: docs, documentCount: 1 })]} />);

    await user.click(screen.getAllByRole("button", { name: "Détails" })[0]);
    await user.click(await screen.findByRole("button", { name: "Supprimer Contrat.pdf" }));

    expect(confirmMock).toHaveBeenCalledWith("Supprimer définitivement le document « Contrat.pdf » ?");
    expect(fetchMock).not.toHaveBeenCalledWith("/api/opportunities/opp-1/documents/doc-1", expect.anything());
  });

  it("deletes a document when the document confirmation is accepted", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    vi.stubGlobal("confirm", vi.fn(() => true));
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ok: true } }) } as Response);
    const docs = [{ id: "doc-1", originalName: "Contrat.pdf", fileName: "doc.pdf", mimeType: "application/pdf", size: 1200 }];

    render(<AdminOpportunityKanban opportunities={[makeOpportunity({ documents: docs, documentCount: 1 })]} />);

    await user.click(screen.getAllByRole("button", { name: "Détails" })[0]);
    await user.click(await screen.findByRole("button", { name: "Supprimer Contrat.pdf" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/opportunities/opp-1/documents/doc-1", { method: "DELETE" });
    });
    expect(toast.success).toHaveBeenCalledWith("Document supprimé.");
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText("Aucun document juridique attaché pour le moment.")).toBeInTheDocument();
  });
});

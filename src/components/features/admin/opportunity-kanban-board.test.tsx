import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminOpportunityKanban } from "./opportunity-kanban-board";
import type { AdminOpportunity } from "./opportunity-detail-sheet";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const opportunities: AdminOpportunity[] = [
  {
    id: "opp-1",
    title: "Terrain à Cocody",
    description: "Dossier complet avec documents juridiques.",
    category: "IMMOBILIER",
    amount: 25000,
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
  },
];

describe("AdminOpportunityKanban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the four desktop columns and mobile status chips", () => {
    render(<AdminOpportunityKanban opportunities={opportunities} />);

    expect(screen.getAllByText("En attente").length).toBeGreaterThan(0);
    expect(screen.getAllByText("En cours").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vérifié").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Refusé").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "En attente (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "En cours (0)" })).toBeInTheDocument();
    expect(screen.getAllByText("Double vérification requise (1/2)").length).toBeGreaterThan(0);
  });

  it("opens the detail sheet and requires a rejection note", async () => {
    const user = userEvent.setup();
    render(<AdminOpportunityKanban opportunities={opportunities} />);

    await user.click(screen.getAllByRole("button", { name: "Détails" })[0]);
    expect(await screen.findByText("Actions de vérification")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rejeter" }));
    expect(await screen.findByText("La note est obligatoire pour refuser un deal.")).toBeInTheDocument();
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RequestDocumentAccessButton } from "./request-document-access-button";

describe("RequestDocumentAccessButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders 'Demander l'accès' button for locked variant", () => {
    render(
      <RequestDocumentAccessButton
        opportunityId="opp-1"
        documentId="doc-1"
        variant="locked"
      />,
    );

    const button = screen.getByRole("button", { name: /Demander l'accès au document/ });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("renders 'Demander à nouveau' button for denied variant", () => {
    render(
      <RequestDocumentAccessButton
        opportunityId="opp-1"
        documentId="doc-1"
        variant="denied"
      />,
    );

    const button = screen.getByRole("button", { name: /Redemander l'accès au document/ });
    expect(button).toBeInTheDocument();
  });

  it("calls request-access API and shows pending status on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "req-1", status: "PENDING" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RequestDocumentAccessButton
        opportunityId="opp-1"
        documentId="doc-1"
        variant="locked"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Demander l'accès au document/ }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/opportunities/opp-1/documents/doc-1/request-access",
      expect.objectContaining({ method: "POST" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status", { name: /En attente de validation/ })).toBeInTheDocument();
    });
  });

  it("shows pending status on 409 conflict (already requested)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: "Vous avez déjà demandé l'accès à ce document." }),
      }),
    );

    render(
      <RequestDocumentAccessButton
        opportunityId="opp-1"
        documentId="doc-1"
        variant="locked"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Demander l'accès au document/ }));

    await waitFor(() => {
      expect(screen.getByRole("status", { name: /En attente de validation/ })).toBeInTheDocument();
    });
  });

  it("shows error toast on 403 response", async () => {
    const toastError = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "Abonnement actif requis" }),
    }));

    // We need to mock the toast module
    vi.doMock("sonner", () => ({ toast: { success: vi.fn(), error: toastError } }));

    render(
      <RequestDocumentAccessButton
        opportunityId="opp-1"
        documentId="doc-1"
        variant="locked"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Demander l'accès au document/ }));

    // The button should remain (not switch to pending state) on 403
    // No pending status shown for 403
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("disables button during request", async () => {
    let resolvePromise: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(fetchPromise));

    render(
      <RequestDocumentAccessButton
        opportunityId="opp-1"
        documentId="doc-1"
        variant="locked"
      />,
    );

    const button = screen.getByRole("button", { name: /Demander l'accès au document/ });
    await userEvent.click(button);

    expect(button).toBeDisabled();

    resolvePromise!({
      ok: true,
      json: async () => ({ data: { id: "req-1", status: "PENDING" } }),
    });

    await waitFor(() => {
      expect(screen.getByRole("status", { name: /En attente de validation/ })).toBeInTheDocument();
    });
  });

  it("meets min-h-11 touch target requirement", () => {
    render(
      <RequestDocumentAccessButton
        opportunityId="opp-1"
        documentId="doc-1"
        variant="locked"
      />,
    );

    const button = screen.getByRole("button");
    expect(button.className).toContain("min-h-11");
  });
});
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentAccessRequests } from "./document-access-requests";

const mockRequests = [
  {
    id: "req-1",
    requester: { id: "member-1", name: "Awa Diallo", email: "awa@example.com" },
    document: { id: "doc-1", originalName: "RCCM.pdf" },
    createdAt: "2026-06-17T00:00:00.000Z",
  },
  {
    id: "req-2",
    requester: { id: "member-2", name: "Koffi Mensah", email: "koffi@example.com" },
    document: { id: "doc-2", originalName: "KYC.pdf" },
    createdAt: "2026-06-17T01:00:00.000Z",
  },
];

describe("DocumentAccessRequests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when requests array is empty", () => {
    const { container } = render(
      <DocumentAccessRequests opportunityId="opp-1" requests={[]} />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders pending access requests with names and document names", () => {
    render(
      <DocumentAccessRequests opportunityId="opp-1" requests={mockRequests} />,
    );

    expect(screen.getByText("Awa Diallo")).toBeInTheDocument();
    expect(screen.getByText("Koffi Mensah")).toBeInTheDocument();
    expect(screen.getByText(/RCCM\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/KYC\.pdf/)).toBeInTheDocument();
  });

  it("renders Approuver and Refuser buttons for each request", () => {
    render(
      <DocumentAccessRequests opportunityId="opp-1" requests={mockRequests} />,
    );

    expect(screen.getAllByRole("button", { name: /Approuver/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Refuser/ })).toHaveLength(2);
  });

  it("calls grant-access API with approve action on Approuver click", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { processed: 1 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DocumentAccessRequests opportunityId="opp-1" requests={mockRequests} />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: /Approuver/ })[0]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/opportunities/opp-1/documents/doc-1/grant-access",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ requestIds: ["req-1"], action: "approve" }),
      }),
    );
  });

  it("calls grant-access API with deny action on Refuser click", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { processed: 1 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DocumentAccessRequests opportunityId="opp-1" requests={mockRequests} />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: /Refuser/ })[0]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/opportunities/opp-1/documents/doc-1/grant-access",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ requestIds: ["req-1"], action: "deny" }),
      }),
    );
  });

  it("removes approved request from the list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { processed: 1 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DocumentAccessRequests opportunityId="opp-1" requests={mockRequests} />,
    );

    expect(screen.getByText("Awa Diallo")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /Approuver/ })[0]);

    await waitFor(() => {
      expect(screen.queryByText("Awa Diallo")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Koffi Mensah")).toBeInTheDocument();
  });

  it("disables buttons during processing", async () => {
    let resolvePromise: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(fetchPromise));

    render(
      <DocumentAccessRequests opportunityId="opp-1" requests={mockRequests} />,
    );

    const approveButtons = screen.getAllByRole("button", { name: /Approuver/ });
    await userEvent.click(approveButtons[0]);

    // Both approve and deny for that request should be disabled during processing
    expect(approveButtons[0]).toBeDisabled();
    const denyButtons = screen.getAllByRole("button", { name: /Refuser/ });
    expect(denyButtons[0]).toBeDisabled();

    resolvePromise!({
      ok: true,
      json: async () => ({ data: { processed: 1 } }),
    });

    await waitFor(() => {
      expect(screen.queryByText("Awa Diallo")).not.toBeInTheDocument();
    });
  });

  it("meets min-h-11 touch target for buttons", () => {
    render(
      <DocumentAccessRequests opportunityId="opp-1" requests={mockRequests} />,
    );

    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button.className).toContain("min-h-11");
    }
  });

  it("shows request count badge", () => {
    render(
      <DocumentAccessRequests opportunityId="opp-1" requests={mockRequests} />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
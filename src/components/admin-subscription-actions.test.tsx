import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSubscriptionActions } from "./admin-subscription-actions";

const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe("AdminSubscriptionActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: { id: "sub-1" } }) }) as typeof fetch;
  });

  it("validates a pending subscription with an explicit confirmation action", async () => {
    const user = userEvent.setup();
    render(<AdminSubscriptionActions subscriptionId="sub-1" status="PENDING" />);

    await user.click(screen.getByRole("button", { name: /Valider/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/admin/subscriptions/sub-1", expect.objectContaining({ method: "PATCH" })));
    expect(JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)).toEqual({ action: "validate" });
    expect(mockToastSuccess).toHaveBeenCalledWith("Abonnement validé.");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("requires and submits a refusal justification", async () => {
    const user = userEvent.setup();
    render(<AdminSubscriptionActions subscriptionId="sub-1" status="PENDING" />);

    await user.click(screen.getByRole("button", { name: /Refuser/i }));
    expect(screen.getByLabelText("Justification du refus")).toBeRequired();
    await user.type(screen.getByLabelText("Justification du refus"), "Virement introuvable");
    await user.click(screen.getByRole("button", { name: /Confirmer le refus/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)).toEqual({
      action: "reject",
      reason: "Virement introuvable",
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Abonnement refusé.");
  });

  it("suspends active subscriptions with destructive copy", async () => {
    const user = userEvent.setup();
    render(<AdminSubscriptionActions subscriptionId="sub-2" status="ACTIVE" />);

    expect(screen.getByText(/bloquera l’accès premium/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Suspendre/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)).toEqual({ action: "suspend" });
  });

  it("shows API errors via toaster", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: "Transition invalide" }) }) as typeof fetch;
    const user = userEvent.setup();
    render(<AdminSubscriptionActions subscriptionId="sub-1" status="PENDING" />);

    await user.click(screen.getByRole("button", { name: /Valider/i }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("Transition invalide"));
  });
});

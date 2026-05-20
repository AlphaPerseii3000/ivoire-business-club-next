import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InterestButton } from "./interest-button";

describe("InterestButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the initial interested state as disabled", () => {
    render(<InterestButton opportunityId="opp-1" isAuthenticated={true} initialInterested={true} />);

    const button = screen.getByRole("button", { name: "Intérêt enregistré" });
    expect(button).toBeDisabled();
    expect(screen.getByText("Intérêt enregistré")).toBeInTheDocument();
  });

  it("records interest and switches to success state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { created: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const onInterestRecorded = vi.fn();

    render(<InterestButton opportunityId="opp-1" isAuthenticated={true} onInterestRecorded={onInterestRecorded} />);
    await userEvent.click(screen.getByRole("button", { name: "Intéressé(e)" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/opportunities/opp-1/interest", expect.objectContaining({ method: "POST" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Intérêt enregistré" })).toBeDisabled());
    expect(onInterestRecorded).toHaveBeenCalledTimes(1);
  });

  it("shows a French error when the API rejects the request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Votre abonnement doit être actif pour marquer votre intérêt." }),
    }));

    render(<InterestButton opportunityId="opp-1" isAuthenticated={true} />);
    await userEvent.click(screen.getByRole("button", { name: "Intéressé(e)" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Votre abonnement doit être actif pour marquer votre intérêt.");
  });

  it("opens signup/signin modal for visitors without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<InterestButton opportunityId="opp-1" isAuthenticated={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Intéressé(e)" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Connectez-vous pour marquer votre intérêt")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "S'inscrire" })).toHaveAttribute("href", "/auth/signup");
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/auth/signin");
  });
});

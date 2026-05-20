import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewForm } from "./review-form";

const mockRefresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe("ReviewForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { review: { id: "review-1" } } }) }) as typeof fetch;
  });

  it("renders accessible stars, comment field, and submit button", () => {
    render(<ReviewForm opportunityId="opp-1" />);

    expect(screen.getByRole("heading", { name: "Laisser un avis" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "5 étoiles" })).toBeInTheDocument();
    expect(screen.getByLabelText("Commentaire")).toHaveAttribute("maxLength", "500");
    expect(screen.getByRole("button", { name: "Soumettre mon avis" })).toBeDisabled();
  });

  it("submits valid reviews and refreshes the page", async () => {
    render(<ReviewForm opportunityId="opp-1" />);

    fireEvent.click(screen.getByRole("radio", { name: "5 étoiles" }));
    fireEvent.change(screen.getByLabelText("Commentaire"), { target: { value: "Très bon échange" } });
    fireEvent.click(screen.getByRole("button", { name: "Soumettre mon avis" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/opportunities/opp-1/reviews", expect.objectContaining({ method: "POST" }));
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("shows server errors in French", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Vous avez déjà laissé un avis pour ce deal." }) }) as typeof fetch;
    render(<ReviewForm opportunityId="opp-1" />);

    fireEvent.click(screen.getByRole("radio", { name: "4 étoiles" }));
    fireEvent.change(screen.getByLabelText("Commentaire"), { target: { value: "Bon échange" } });
    fireEvent.click(screen.getByRole("button", { name: "Soumettre mon avis" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Vous avez déjà laissé un avis pour ce deal.");
  });
});

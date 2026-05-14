import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { SubscriptionActivationNotice } from "./subscription-activation-notice";

describe("SubscriptionActivationNotice", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders French activation celebration with tier badge and deals CTA", async () => {
    render(<SubscriptionActivationNotice subscriptionId="sub-1" tier="BOSS" />);

    expect(await screen.findByText("Bienvenue dans le club IBC !")).toBeInTheDocument();
    expect(screen.getByText("Boss")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Découvrir les deals" })).toHaveAttribute("href", "/opportunities");
  });

  it("persists dismissal in localStorage by subscription id", async () => {
    const user = userEvent.setup();
    render(<SubscriptionActivationNotice subscriptionId="sub-dismiss" tier="AFFRANCHI" />);

    await screen.findByText("Bienvenue dans le club IBC !");
    await user.click(screen.getByRole("button", { name: "Masquer" }));

    await waitFor(() => {
      expect(screen.queryByText("Bienvenue dans le club IBC !")).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem("ibc:subscription-activation-notice:sub-dismiss")).toBe("dismissed");
  });
});

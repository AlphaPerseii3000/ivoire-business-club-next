import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DealStats } from "./deal-stats";

describe("DealStats", () => {
  it("returns null when isOwnDeal is false", () => {
    const { container } = render(
      <DealStats contactLogCount={5} interestCount={3} isOwnDeal={false} />,
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("deal-stats")).not.toBeInTheDocument();
  });

  it("renders WhatsApp and interest counters for own deals", () => {
    render(<DealStats contactLogCount={7} interestCount={2} isOwnDeal={true} />);

    const whatsappBadge = screen.getByTestId("deal-stats-whatsapp");
    const interestBadge = screen.getByTestId("deal-stats-interests");

    expect(whatsappBadge).toHaveTextContent("7");
    expect(interestBadge).toHaveTextContent("2");
  });

  it("renders zero counters with muted style for own deals", () => {
    render(<DealStats contactLogCount={0} interestCount={0} isOwnDeal={true} />);

    const whatsappBadge = screen.getByTestId("deal-stats-whatsapp");
    const interestBadge = screen.getByTestId("deal-stats-interests");

    expect(whatsappBadge).toHaveTextContent("0");
    expect(interestBadge).toHaveTextContent("0");
    expect(whatsappBadge.className).toContain("bg-muted/50");
    expect(interestBadge.className).toContain("bg-muted/50");
  });

  it("uses highlighted style when counts are greater than zero", () => {
    render(<DealStats contactLogCount={1} interestCount={1} isOwnDeal={true} />);

    const whatsappBadge = screen.getByTestId("deal-stats-whatsapp");
    const interestBadge = screen.getByTestId("deal-stats-interests");

    expect(whatsappBadge.className).toContain("text-teal-700");
    expect(interestBadge.className).toContain("text-amber-700");
  });
});

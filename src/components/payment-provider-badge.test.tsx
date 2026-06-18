import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaymentProviderBadge } from "./payment-provider-badge";

describe("PaymentProviderBadge", () => {
  it("renders Wave with blue color classes", () => {
    const { container } = render(<PaymentProviderBadge provider="WAVE" />);

    expect(screen.getByText("Wave")).toBeInTheDocument();
    expect(container.querySelector(".border-blue-200")).toBeInTheDocument();
    expect(container.querySelector(".bg-blue-50")).toBeInTheDocument();
    expect(container.querySelector(".text-blue-800")).toBeInTheDocument();
  });

  it("renders Orange Money with orange color classes", () => {
    const { container } = render(<PaymentProviderBadge provider="ORANGE_MONEY" />);

    expect(screen.getByText("Orange Money")).toBeInTheDocument();
    expect(container.querySelector(".border-orange-200")).toBeInTheDocument();
    expect(container.querySelector(".bg-orange-50")).toBeInTheDocument();
    expect(container.querySelector(".text-orange-800")).toBeInTheDocument();
  });

  it("renders bank transfer with neutral slate classes", () => {
    const { container } = render(<PaymentProviderBadge provider="BANK_TRANSFER" />);

    expect(screen.getByText("Virement bancaire")).toBeInTheDocument();
    expect(container.querySelector(".border-slate-200")).toBeInTheDocument();
    expect(container.querySelector(".bg-slate-100")).toBeInTheDocument();
    expect(container.querySelector(".text-slate-700")).toBeInTheDocument();
  });

  it("displays providerPhone when showPhone is true", () => {
    render(<PaymentProviderBadge provider="WAVE" providerPhone="+225 01 23 45 67 89" showPhone />);

    expect(screen.getByText("+225 01 23 45 67 89")).toBeInTheDocument();
  });

  it("does not display providerPhone when showPhone is false", () => {
    render(<PaymentProviderBadge provider="WAVE" providerPhone="+225 01 23 45 67 89" />);

    expect(screen.queryByText("+225 01 23 45 67 89")).not.toBeInTheDocument();
  });
});

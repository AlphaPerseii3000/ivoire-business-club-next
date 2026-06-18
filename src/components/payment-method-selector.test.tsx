import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PaymentMethodSelector, formatPhoneForInput } from "./payment-method-selector";

describe("PaymentMethodSelector", () => {
  it("displays three payment options with bank transfer selected by default", () => {
    render(<PaymentMethodSelector />);

    expect(screen.getByRole("radio", { name: /Virement bancaire/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Wave/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /Orange Money/i })).toHaveAttribute("aria-checked", "false");
  });

  it("shows phone field when Wave is selected and hides it for bank transfer", async () => {
    const user = userEvent.setup();
    render(<PaymentMethodSelector />);

    expect(screen.queryByTestId("provider-phone-input")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Wave/i }));
    expect(screen.getByTestId("provider-phone-input")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Virement bancaire/i }));
    expect(screen.queryByTestId("provider-phone-input")).not.toBeInTheDocument();
  });

  it("shows phone field when Orange Money is selected", async () => {
    const user = userEvent.setup();
    render(<PaymentMethodSelector />);

    await user.click(screen.getByRole("radio", { name: /Orange Money/i }));
    expect(screen.getByTestId("provider-phone-input")).toBeInTheDocument();
  });

  it("calls onSubmit with provider and phone for Wave", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PaymentMethodSelector onSubmit={onSubmit} />);

    await user.click(screen.getByRole("radio", { name: /Wave/i }));
    await user.type(screen.getByTestId("provider-phone-input"), "+225 01 23 45 67 89");
    await user.click(screen.getByTestId("payment-method-submit"));

    expect(onSubmit).toHaveBeenCalledWith("WAVE", "+2250123456789");
  });

  it("calls onSubmit with provider and phone for Orange Money", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PaymentMethodSelector onSubmit={onSubmit} />);

    await user.click(screen.getByRole("radio", { name: /Orange Money/i }));
    await user.type(screen.getByTestId("provider-phone-input"), "+221 77 123 45 67");
    await user.click(screen.getByTestId("payment-method-submit"));

    expect(onSubmit).toHaveBeenCalledWith("ORANGE_MONEY", "+221771234567");
  });

  it("calls onSubmit with only provider for bank transfer", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PaymentMethodSelector onSubmit={onSubmit} />);

    await user.click(screen.getByTestId("payment-method-submit"));

    expect(onSubmit).toHaveBeenCalledWith("BANK_TRANSFER");
  });

  it("does not submit Wave without a phone number", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PaymentMethodSelector onSubmit={onSubmit} />);

    await user.click(screen.getByRole("radio", { name: /Wave/i }));
    await user.click(screen.getByTestId("payment-method-submit"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onCancel when Annuler is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<PaymentMethodSelector onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /Annuler/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("displays error message when provided", () => {
    render(<PaymentMethodSelector error="Erreur de test" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Erreur de test");
  });

  it("disables submit button while loading", () => {
    render(<PaymentMethodSelector isLoading />);
    expect(screen.getByTestId("payment-method-submit")).toBeDisabled();
  });

  it("strips non-international characters from phone input", async () => {
    const user = userEvent.setup();
    render(<PaymentMethodSelector />);

    await user.click(screen.getByRole("radio", { name: /Wave/i }));
    await user.type(screen.getByTestId("provider-phone-input"), "+225 abc 01.23-45 67");

    expect(screen.getByTestId("provider-phone-input")).toHaveValue(formatPhoneForInput("+225 abc 01.23-45 67"));
  });

  it("blocks submission and shows a prefix error for unsupported country indicatif", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PaymentMethodSelector onSubmit={onSubmit} />);

    await user.click(screen.getByRole("radio", { name: /Wave/i }));
    await user.type(screen.getByTestId("provider-phone-input"), "+33612345678");
    await user.click(screen.getByTestId("payment-method-submit"));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Indicatif non supporté/i)).toBeInTheDocument();
  });
});

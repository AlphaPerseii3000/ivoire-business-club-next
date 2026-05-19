import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WhatsAppCTA } from "./whatsapp-cta";

describe("WhatsAppCTA", () => {
  it("renders a link with the correct wa.me URL when phone number is provided", () => {
    render(
      <WhatsAppCTA
        phoneNumber="+225 07 00 00 00 00"
        prefilledMessage="Bonjour, je suis intéressé(e) par votre deal Test Deal sur IBC."
      />,
    );

    const link = screen.getByRole("link", { name: "Contacter sur WhatsApp" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", expect.stringContaining("https://wa.me/2250700000000"));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders a link with custom label when label prop is provided", () => {
    render(
      <WhatsAppCTA
        phoneNumber="+225 07 00 00 00 00"
        prefilledMessage="Bonjour, je suis intéressé(e) par votre profil sur IBC."
        label="Discuter sur WhatsApp"
      />,
    );

    const link = screen.getByRole("link", { name: "Discuter sur WhatsApp" });
    expect(link).toBeInTheDocument();
  });

  it("renders a link with 'Contacter le porteur sur WhatsApp' label for deal context", () => {
    render(
      <WhatsAppCTA
        phoneNumber="+225 07 00 00 00 00"
        prefilledMessage="Bonjour, je suis intéressé(e) par votre deal Mon Deal sur IBC."
        label="Contacter le porteur sur WhatsApp"
      />,
    );

    const link = screen.getByRole("link", { name: "Contacter le porteur sur WhatsApp" });
    expect(link).toBeInTheDocument();
  });

  it("renders disabled button with tooltip when phone number is null", () => {
    render(
      <WhatsAppCTA
        phoneNumber={null}
        prefilledMessage="Bonjour"
      />,
    );

    const button = screen.getByRole("button", { name: "Contacter sur WhatsApp" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("data-slot", "tooltip-trigger");
    expect(button.className).toContain("cursor-not-allowed");
    expect(button.className).toContain("opacity-60");
  });

  it("renders disabled button with tooltip when phone number is empty string", () => {
    render(
      <WhatsAppCTA
        phoneNumber=""
        prefilledMessage="Bonjour"
      />,
    );

    const button = screen.getByRole("button", { name: "Contacter sur WhatsApp" });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("cursor-not-allowed");
  });

  it("renders disabled button with custom label when phone is missing", () => {
    render(
      <WhatsAppCTA
        phoneNumber={null}
        prefilledMessage="Bonjour"
        label="Discuter sur WhatsApp"
      />,
    );

    const button = screen.getByRole("button", { name: "Discuter sur WhatsApp" });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("cursor-not-allowed");
  });

  it("encodes the pre-filled message in the wa.me URL", () => {
    render(
      <WhatsAppCTA
        phoneNumber="+225 07 00 00 00 00"
        prefilledMessage="Bonjour, je suis intéressé(e) par votre deal Test Deal sur IBC."
      />,
    );

    const link = screen.getByRole("link");
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("text=");
    const textParam = new URL(href).searchParams.get("text");
    expect(textParam).toBe("Bonjour, je suis intéressé(e) par votre deal Test Deal sur IBC.");
  });
});
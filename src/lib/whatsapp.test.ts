import { describe, expect, it } from "vitest";

import { buildWhatsAppSupportLink, normalizeWhatsAppNumber } from "./whatsapp";

describe("whatsapp helpers", () => {
  it("normalizes phone numbers and encodes support messages safely", () => {
    expect(normalizeWhatsAppNumber("+225 07 00 00 00 00")).toBe("2250700000000");

    const link = buildWhatsAppSupportLink({
      phoneNumber: "+225 07 00 00 00 00",
      message: "Bonjour IBC, référence IBC-user-GRAND_FRERE",
    });

    expect(link).toBe("https://wa.me/2250700000000?text=Bonjour%20IBC%2C%20r%C3%A9f%C3%A9rence%20IBC-user-GRAND_FRERE");
  });

  it("returns null when no usable number is configured", () => {
    expect(buildWhatsAppSupportLink({ phoneNumber: "", message: "Bonjour" })).toBeNull();
  });
});

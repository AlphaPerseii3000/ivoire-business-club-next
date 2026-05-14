import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn(function ResendMock() {
    return { emails: { send: mockSend } };
  }),
}));

describe("email helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "IBC <noreply@example.com>";
    delete process.env.APP_URL;
  });

  it("sends the exact French subscription activation copy once through the Resend wrapper", async () => {
    const { sendSubscriptionActivatedEmail } = await import("./email");

    await sendSubscriptionActivatedEmail({
      to: "member@example.com",
      name: "Awa",
      tier: "GRAND_FRERE",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({
      from: "IBC <noreply@example.com>",
      to: "member@example.com",
      subject: "Votre abonnement IBC est activé",
      text: expect.stringContaining("Votre abonnement IBC Grands Frères est activé. Bienvenue dans le club !"),
    });
  });
});

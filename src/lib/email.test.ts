import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSendMail = vi.hoisted(() => vi.fn());

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

describe("email helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.MAIL_HOST = "mail.infomaniak.com";
    process.env.MAIL_PORT = "587";
    process.env.MAIL_USERNAME = "test@ivoire-business-club.com";
    process.env.MAIL_PASSWORD = "test-password";
    process.env.MAIL_ENCRYPTION = "tls";
    process.env.MAIL_FROM_ADDRESS = "sarah@ivoire-business-club.com";
    process.env.MAIL_FROM_NAME = "Ivoire Business Club";
    delete process.env.APP_URL;
  });

  it("sends the exact French subscription activation copy via SMTP", async () => {
    const { sendSubscriptionActivatedEmail, _resetTransporter } = await import(
      "./email"
    );
    _resetTransporter();

    await sendSubscriptionActivatedEmail({
      to: "member@example.com",
      name: "Awa",
      tier: "GRAND_FRERE",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { name: "Ivoire Business Club", address: "sarah@ivoire-business-club.com" },
        to: "member@example.com",
        subject: "Votre abonnement IBC est activé",
        text: expect.stringContaining(
          "Votre abonnement IBC Grands Frères est activé. Bienvenue dans le club !"
        ),
      })
    );
  });

  it("sends the admin confirmation email with dashboard link", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    const { sendAdminSubscriptionConfirmationEmail, _resetTransporter } =
      await import("./email");
    _resetTransporter();

    await sendAdminSubscriptionConfirmationEmail({
      to: "member@example.com",
      name: "Awa",
      tier: "BOSS",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { name: "Ivoire Business Club", address: "sarah@ivoire-business-club.com" },
        to: "member@example.com",
        subject: "Votre abonnement IBC est confirmé",
        text: expect.stringContaining(
          "Votre espace membre : https://ivoirebusinessclub.test/dashboard"
        ),
      })
    );
  });

  it("throws when MAIL credentials are missing", async () => {
    delete process.env.MAIL_HOST;
    delete process.env.MAIL_USERNAME;
    delete process.env.MAIL_PASSWORD;
    const { sendSubscriptionActivatedEmail, _resetTransporter } = await import(
      "./email"
    );
    _resetTransporter();

    await expect(
      sendSubscriptionActivatedEmail({
        to: "member@example.com",
        name: "Awa",
        tier: "AFFRANCHI",
      })
    ).rejects.toThrow(
      "MAIL_HOST, MAIL_USERNAME, and MAIL_PASSWORD must be configured"
    );
  });

  it("uses MAIL_FROM_ADDRESS and MAIL_FROM_NAME as sender", async () => {
    process.env.MAIL_FROM_ADDRESS = "custom@ibc.test";
    process.env.MAIL_FROM_NAME = "IBC Custom";
    const { sendSubscriptionActivatedEmail, _resetTransporter } = await import(
      "./email"
    );
    _resetTransporter();

    await sendSubscriptionActivatedEmail({
      to: "member@example.com",
      name: "Awa",
      tier: "AFFRANCHI",
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { name: "IBC Custom", address: "custom@ibc.test" },
      })
    );
  });
});
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

  it("sends verification email with correct link and copy", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    const { sendEmailVerificationEmail, _resetTransporter } = await import("./email");
    _resetTransporter();

    await sendEmailVerificationEmail({
      to: "newmember@example.com",
      name: "Jean",
      token: "secret-token-123",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "newmember@example.com",
        subject: "Vérifiez votre adresse email - Ivoire Business Club",
        text: expect.stringContaining(
          "https://ivoirebusinessclub.test/auth/verify-email?token=secret-token-123"
        ),
      })
    );
  });

  it("sends welcome email with tier label, profile link and payment instructions", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    process.env.BANK_TRANSFER_IBAN = "FR76 3000 3069 9000 1016 1063 363";
    process.env.BANK_TRANSFER_BIC = "SOGEFRPPXXX";
    process.env.BANK_TRANSFER_BANK_ADDRESS = "17 Cours Valmy Tour Granite 92800 Paris La Défense 7 France";
    process.env.ADHESION_CONTRACT_URL = "https://ivoirebusinessclub.test/contrat-adhesion.pdf";

    const { sendWelcomeEmail, _resetTransporter } = await import("./email");
    _resetTransporter();

    await sendWelcomeEmail({
      to: "newmember@example.com",
      name: "Awa",
      tier: "GRAND_FRERE",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { name: "Ivoire Business Club", address: "sarah@ivoire-business-club.com" },
        to: "newmember@example.com",
        subject: "Bienvenue sur Ivoire Business Club — Vos prochaines étapes",
        text: expect.stringContaining("Vous démarrez avec le tier Grands Frères (plan par défaut). Vous pourrez choisir votre abonnement définitif dans votre espace membre."),
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("https://ivoirebusinessclub.test/onboarding/complete-profile"),
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Pour finaliser votre adhésion, merci d'effectuer un virement bancaire"),
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("IBAN : FR76 3000 3069 9000 1016 1063 363"),
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Contrat d'adhésion : https://ivoirebusinessclub.test/contrat-adhesion.pdf"),
      })
    );
  });

  it("omits contract line and payment instructions when env vars are not set", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    delete process.env.BANK_TRANSFER_IBAN;
    delete process.env.BANK_TRANSFER_BIC;
    delete process.env.BANK_TRANSFER_BANK_ADDRESS;
    delete process.env.ADHESION_CONTRACT_URL;

    const { sendWelcomeEmail, _resetTransporter } = await import("./email");
    _resetTransporter();

    await sendWelcomeEmail({
      to: "newmember@example.com",
      name: "Awa",
      tier: "AFFRANCHI",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const text = mockSendMail.mock.calls[0][0].text;
    expect(text).not.toContain("Pour finaliser votre adhésion");
    expect(text).not.toContain("Contrat d'adhésion");
  });
});
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

  it("sends generic welcome email post-signup with /pricing link and no payment instructions", async () => {
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
      tier: "AFFRANCHI",
      userId: "user123",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const text = mockSendMail.mock.calls[0][0].text;
    expect(text).toContain(
      "Votre inscription sur Ivoire Business Club est confirmée. Vous démarrez avec le tier Affranchis (plan par défaut). Vous pourrez choisir votre abonnement définitif dans votre espace membre."
    );
    expect(text).toContain(
      "https://ivoirebusinessclub.test/onboarding/complete-profile"
    );
    expect(text).toContain(
      "Choisissez votre formule d'abonnement dans votre espace membre : https://ivoirebusinessclub.test/pricing"
    );
    expect(text).not.toContain(
      "Pour finaliser votre adhésion, merci d'effectuer"
    );
    expect(text).not.toContain("IBAN :");
    expect(text).toContain(
      "Contrat d'adhésion : https://ivoirebusinessclub.test/contrat-adhesion.pdf"
    );
  });

  it("sends welcome email with bank transfer instructions when paymentProvider is BANK_TRANSFER", async () => {
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
      paymentProvider: "BANK_TRANSFER",
      userId: "user123",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const text = mockSendMail.mock.calls[0][0].text;
    expect(text).toContain(
      "Bienvenue sur Ivoire Business Club. Vous avez choisi le tier Grands Frères. Votre demande d'abonnement est enregistrée."
    );
    expect(text).toContain(
      "Pour finaliser votre adhésion, merci d'effectuer un virement bancaire :"
    );
    expect(text).toContain("IBAN : FR76 3000 3069 9000 1016 1063 363");
    expect(text).toContain("BIC : SOGEFRPPXXX");
    expect(text).not.toContain(
      "Choisissez votre formule d'abonnement dans votre espace membre"
    );
  });

  it("sends welcome email with Wave instructions when paymentProvider is WAVE", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    process.env.NEXT_PUBLIC_WAVE_MERCHANT_NUMBER = "+225****0650";
    process.env.ADHESION_CONTRACT_URL = "https://ivoirebusinessclub.test/contrat-adhesion.pdf";

    const { sendWelcomeEmail, _resetTransporter } = await import("./email");
    _resetTransporter();

    await sendWelcomeEmail({
      to: "newmember@example.com",
      name: "Awa",
      tier: "GRAND_FRERE",
      paymentProvider: "WAVE",
      providerPhone: "+225****0405",
      userId: "user123",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { name: "Ivoire Business Club", address: "sarah@ivoire-business-club.com" },
        to: "newmember@example.com",
        subject: "Bienvenue sur Ivoire Business Club — Vos prochaines étapes",
        text: expect.stringContaining("Pour finaliser votre adhésion, merci d'effectuer un paiement Wave :"),
      })
    );
    const text = mockSendMail.mock.calls[0][0].text;
    expect(text).toContain("Bienvenue sur Ivoire Business Club. Vous avez choisi le tier Grands Frères. Votre demande d'abonnement est enregistrée.");
    expect(text).toContain("Numéro marchand Wave : +225****0650");
    expect(text).toContain("Depuis votre numéro Wave : +225****0405");
    expect(text).toContain("Référence du transfert : IBC-user123-GRAND_FRERE");
    expect(text).toContain("- Ouvre ton application Wave.");
    expect(text).not.toContain("Choisissez votre formule d'abonnement dans votre espace membre");
  });

  it("sends welcome email with Orange Money instructions when paymentProvider is ORANGE_MONEY", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    process.env.NEXT_PUBLIC_ORANGE_MONEY_MERCHANT_NUMBER = "+225****0650";
    process.env.NEXT_PUBLIC_ORANGE_MONEY_USSD_CODE = "#144#";
    process.env.ADHESION_CONTRACT_URL = "https://ivoirebusinessclub.test/contrat-adhesion.pdf";

    const { sendWelcomeEmail, _resetTransporter } = await import("./email");
    _resetTransporter();

    await sendWelcomeEmail({
      to: "newmember@example.com",
      name: "Awa",
      tier: "GRAND_FRERE",
      paymentProvider: "ORANGE_MONEY",
      providerPhone: "+225****0405",
      userId: "user123",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { name: "Ivoire Business Club", address: "sarah@ivoire-business-club.com" },
        to: "newmember@example.com",
        subject: "Bienvenue sur Ivoire Business Club — Vos prochaines étapes",
        text: expect.stringContaining("Pour finaliser votre adhésion, merci d'effectuer un paiement Orange Money :"),
      })
    );
    const text = mockSendMail.mock.calls[0][0].text;
    expect(text).toContain("Bienvenue sur Ivoire Business Club. Vous avez choisi le tier Grands Frères. Votre demande d'abonnement est enregistrée.");
    expect(text).toContain("Numéro marchand Orange Money : +225****0650");
    expect(text).toContain("Depuis votre numéro Orange Money : +225****0405");
    expect(text).toContain("Référence du transfert : IBC-user123-GRAND_FRERE");
    expect(text).toContain("- Compose le code USSD #144# ou ouvre ton application Orange Money.");
    expect(text).not.toContain("Choisissez votre formule d'abonnement dans votre espace membre");
  });

  it("does not include payment section but includes /pricing link when paymentProvider is null", async () => {
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
      paymentProvider: null,
      userId: "user123",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const text = mockSendMail.mock.calls[0][0].text;
    expect(text).not.toContain("Pour finaliser votre adhésion");
    expect(text).toContain(
      "Choisissez votre formule d'abonnement dans votre espace membre : https://ivoirebusinessclub.test/pricing"
    );
    expect(text).not.toContain("Contrat d'adhésion");
  });

  it("sends reminder EMAIL_VERIFICATION with correct French copy and link", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    const { sendReminderEmail, _resetTransporter } = await import("./email");
    _resetTransporter();

    await sendReminderEmail({
      to: "newmember@example.com",
      name: "Jean",
      type: "EMAIL_VERIFICATION",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "newmember@example.com",
        subject: "Vérifiez votre adresse email — Ivoire Business Club",
        text: expect.stringContaining(
          "https://ivoirebusinessclub.test/auth/verify-email?resend=1"
        ),
      })
    );
    const text = mockSendMail.mock.calls[0][0].text;
    expect(text).toContain(
      "Vous recevez cet email car vous avez créé un compte sur Ivoire Business Club."
    );
  });

  it("sends reminder PROFILE_COMPLETION with correct link and legal mention", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    const { sendReminderEmail, _resetTransporter } = await import("./email");
    _resetTransporter();

    await sendReminderEmail({
      to: "newmember@example.com",
      name: "Awa",
      type: "PROFILE_COMPLETION",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const text = mockSendMail.mock.calls[0][0].text;
    expect(text).toContain("https://ivoirebusinessclub.test/onboarding/complete-profile");
    expect(text).toContain("complétez votre profil");
    expect(text).toContain(
      "Vous recevez cet email car vous avez créé un compte sur Ivoire Business Club."
    );
  });

  it("sends reminder FINAL_REMINDER with both links and legal mention", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    const { sendReminderEmail, _resetTransporter } = await import("./email");
    _resetTransporter();

    await sendReminderEmail({
      to: "newmember@example.com",
      name: "Awa",
      type: "FINAL_REMINDER",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const text = mockSendMail.mock.calls[0][0].text;
    expect(text).toContain("https://ivoirebusinessclub.test/auth/verify-email?resend=1");
    expect(text).toContain("https://ivoirebusinessclub.test/onboarding/complete-profile");
    expect(text).toContain("finalisé");
    expect(text).toContain(
      "Vous recevez cet email car vous avez créé un compte sur Ivoire Business Club."
    );
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSend };
    },
  };
});

describe("email helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_xxxxxxxx";
    process.env.RESEND_FROM_EMAIL = "sarah@ivoire-business-club.com";
    delete process.env.APP_URL;
  });

  it("sends the exact French subscription activation copy via Resend", async () => {
    const { sendSubscriptionActivatedEmail } = await import("./email");

    await sendSubscriptionActivatedEmail({
      to: "member@example.com",
      name: "Awa",
      tier: "GRAND_FRERE",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Ivoire Business Club <sarah@ivoire-business-club.com>",
        to: "member@example.com",
        subject: "Votre abonnement IBC est activé",
        text: expect.stringContaining(
          "Votre abonnement IBC Grands Frères est activé. Bienvenue dans le club !"
        ),
        html: expect.stringContaining(
          "Grands Frères"
        ),
      })
    );
  });

  it("sends the admin confirmation email with dashboard link", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    const { sendAdminSubscriptionConfirmationEmail } = await import("./email");

    await sendAdminSubscriptionConfirmationEmail({
      to: "member@example.com",
      name: "Awa",
      tier: "BOSS",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Ivoire Business Club <sarah@ivoire-business-club.com>",
        to: "member@example.com",
        subject: "Votre abonnement IBC est confirmé",
        text: expect.stringContaining(
          "Votre espace membre : https://ivoirebusinessclub.test/dashboard"
        ),
        html: expect.stringContaining(
          "https://ivoirebusinessclub.test/dashboard"
        ),
      })
    );
  });

  it("throws when RESEND credentials are missing", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    const { sendSubscriptionActivatedEmail } = await import("./email");

    await expect(
      sendSubscriptionActivatedEmail({
        to: "member@example.com",
        name: "Awa",
        tier: "AFFRANCHI",
      })
    ).rejects.toThrow(
      "RESEND_API_KEY and RESEND_FROM_EMAIL must be configured"
    );
  });

  it("uses RESEND_FROM_EMAIL as sender name", async () => {
    process.env.RESEND_FROM_EMAIL = "custom@ibc.test";
    const { sendSubscriptionActivatedEmail } = await import("./email");

    await sendSubscriptionActivatedEmail({
      to: "member@example.com",
      name: "Awa",
      tier: "AFFRANCHI",
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Ivoire Business Club <custom@ibc.test>",
      })
    );
  });

  it("sends verification email with correct link and copy", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    const { sendEmailVerificationEmail } = await import("./email");

    await sendEmailVerificationEmail({
      to: "newmember@example.com",
      name: "Jean",
      token: "secret-token-123",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "newmember@example.com",
        subject: "Vérifiez votre adresse email - Ivoire Business Club",
        text: expect.stringContaining(
          "https://ivoirebusinessclub.test/auth/verify-email?token=secret-token-123"
        ),
        html: expect.stringContaining(
          "https://ivoirebusinessclub.test/auth/verify-email?token=secret-token-123"
        ),
      })
    );
  });

  it("sends generic welcome email post-signup with /pricing link and no payment instructions", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    process.env.ADHESION_CONTRACT_URL = "https://ivoirebusinessclub.test/contrat-adhesion.pdf";
    const { sendWelcomeEmail } = await import("./email");

    await sendWelcomeEmail({
      to: "newmember@example.com",
      name: "Awa",
      tier: "AFFRANCHI",
      userId: "user123",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0][0];
    const text = callArgs.text;
    const html = callArgs.html;

    expect(text).toContain(
      "Votre inscription sur Ivoire Business Club est confirmée. Vous démarrez avec le tiers Affranchis (plan par défaut). Vous pourrez choisir votre abonnement définitif dans votre espace membre."
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

    // Verify HTML content
    expect(html).toContain("Ivoire Business Club");
    expect(html).toContain("https://ivoirebusinessclub.test/pricing");
    expect(html).toContain("https://ivoirebusinessclub.test/onboarding/complete-profile");
    expect(html).toContain("https://ivoirebusinessclub.test/contrat-adhesion.pdf");
    expect(html).not.toContain("Coordonnées de Virement Bancaire");
  });

  it("sends welcome email with bank transfer instructions when paymentProvider is BANK_TRANSFER", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    process.env.BANK_TRANSFER_IBAN = "FR76 3000 3069 9000 1016 1063 363";
    process.env.BANK_TRANSFER_BIC = "SOGEFRPPXXX";
    process.env.BANK_TRANSFER_BANK_ADDRESS = "17 Cours Valmy Tour Granite 92800 Paris La Défense 7 France";
    process.env.ADHESION_CONTRACT_URL = "https://ivoirebusinessclub.test/contrat-adhesion.pdf";

    const { sendWelcomeEmail } = await import("./email");

    await sendWelcomeEmail({
      to: "newmember@example.com",
      name: "Awa",
      tier: "GRAND_FRERE",
      paymentProvider: "BANK_TRANSFER",
      userId: "user123",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0][0];
    const text = callArgs.text;
    const html = callArgs.html;

    expect(text).toContain(
      "Bienvenue sur Ivoire Business Club. Vous avez choisi le tiers Grands Frères. Votre demande d'abonnement est enregistrée."
    );
    expect(text).toContain(
      "Pour finaliser votre adhésion, merci d'effectuer un virement bancaire :"
    );
    expect(text).toContain("IBAN : FR76 3000 3069 9000 1016 1063 363");
    expect(text).toContain("BIC : SOGEFRPPXXX");
    expect(text).not.toContain(
      "Choisissez votre formule d'abonnement dans votre espace membre"
    );

    // Verify HTML content
    expect(html).toContain("Coordonnées de Virement Bancaire");
    expect(html).toContain("FR76 3000 3069 9000 1016 1063 363");
    expect(html).toContain("SOGEFRPPXXX");
  });

  it("sends welcome email with Wave instructions when paymentProvider is WAVE", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    process.env.NEXT_PUBLIC_WAVE_MERCHANT_NUMBER = "+225****0650";
    process.env.ADHESION_CONTRACT_URL = "https://ivoirebusinessclub.test/contrat-adhesion.pdf";

    const { sendWelcomeEmail } = await import("./email");

    await sendWelcomeEmail({
      to: "newmember@example.com",
      name: "Awa",
      tier: "GRAND_FRERE",
      paymentProvider: "WAVE",
      providerPhone: "+225****0405",
      userId: "user123",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Ivoire Business Club <sarah@ivoire-business-club.com>",
        to: "newmember@example.com",
        subject: "Bienvenue sur Ivoire Business Club — Vos prochaines étapes",
        text: expect.stringContaining("Pour finaliser votre adhésion, merci d'effectuer un paiement Wave :"),
        html: expect.stringContaining("Instructions de Paiement Mobile Money (Wave)"),
      })
    );
    const callArgs = mockSend.mock.calls[0][0];
    const text = callArgs.text;
    const html = callArgs.html;

    expect(text).toContain("Bienvenue sur Ivoire Business Club. Vous avez choisi le tiers Grands Frères. Votre demande d'abonnement est enregistrée.");
    expect(text).toContain("Numéro marchand Wave : +225****0650");
    expect(text).toContain("Depuis votre numéro Wave : +225****0405");
    expect(text).toContain("Référence du transfert : IBC-user123-GRAND_FRERE");
    expect(text).toContain("- Ouvre ton application Wave.");
    expect(text).not.toContain("Choisissez votre formule d'abonnement dans votre espace membre");

    expect(html).toContain("+225****0650");
    expect(html).toContain("IBC-user123-GRAND_FRERE");
  });

  it("sends welcome email with Orange Money instructions when paymentProvider is ORANGE_MONEY", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    process.env.NEXT_PUBLIC_ORANGE_MONEY_MERCHANT_NUMBER = "+225****0650";
    process.env.NEXT_PUBLIC_ORANGE_MONEY_USSD_CODE = "#144#";
    process.env.ADHESION_CONTRACT_URL = "https://ivoirebusinessclub.test/contrat-adhesion.pdf";

    const { sendWelcomeEmail } = await import("./email");

    await sendWelcomeEmail({
      to: "newmember@example.com",
      name: "Awa",
      tier: "GRAND_FRERE",
      paymentProvider: "ORANGE_MONEY",
      providerPhone: "+225****0405",
      userId: "user123",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Ivoire Business Club <sarah@ivoire-business-club.com>",
        to: "newmember@example.com",
        subject: "Bienvenue sur Ivoire Business Club — Vos prochaines étapes",
        text: expect.stringContaining("Pour finaliser votre adhésion, merci d'effectuer un paiement Orange Money :"),
        html: expect.stringContaining("Instructions de Paiement Mobile Money (Orange Money)"),
      })
    );
    const callArgs = mockSend.mock.calls[0][0];
    const text = callArgs.text;
    const html = callArgs.html;

    expect(text).toContain("Bienvenue sur Ivoire Business Club. Vous avez choisi le tiers Grands Frères. Votre demande d'abonnement est enregistrée.");
    expect(text).toContain("Numéro marchand Orange Money : +225****0650");
    expect(text).toContain("Depuis votre numéro Orange Money : +225****0405");
    expect(text).toContain("Référence du transfert : IBC-user123-GRAND_FRERE");
    expect(text).toContain("- Compose le code USSD #144# ou ouvre ton application Orange Money.");
    expect(text).not.toContain("Choisissez votre formule d'abonnement dans votre espace membre");

    expect(html).toContain("+225****0650");
    expect(html).toContain("IBC-user123-GRAND_FRERE");
  });

  it("does not include payment section but includes /pricing link when paymentProvider is null", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    delete process.env.BANK_TRANSFER_IBAN;
    delete process.env.BANK_TRANSFER_BIC;
    delete process.env.BANK_TRANSFER_BANK_ADDRESS;
    delete process.env.ADHESION_CONTRACT_URL;

    const { sendWelcomeEmail } = await import("./email");

    await sendWelcomeEmail({
      to: "newmember@example.com",
      name: "Awa",
      tier: "AFFRANCHI",
      paymentProvider: null,
      userId: "user123",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0][0];
    const text = callArgs.text;
    const html = callArgs.html;

    expect(text).not.toContain("Pour finaliser votre adhésion");
    expect(text).toContain(
      "Choisissez votre formule d'abonnement dans votre espace membre : https://ivoirebusinessclub.test/pricing"
    );
    expect(text).not.toContain("Contrat d'adhésion");

    expect(html).toContain("https://ivoirebusinessclub.test/pricing");
  });

  it("sends reminder EMAIL_VERIFICATION with correct French copy and link", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    const { sendReminderEmail } = await import("./email");

    await sendReminderEmail({
      to: "newmember@example.com",
      name: "Jean",
      type: "EMAIL_VERIFICATION",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "newmember@example.com",
        subject: "Vérifiez votre adresse email — Ivoire Business Club",
        text: expect.stringContaining(
          "https://ivoirebusinessclub.test/auth/verify-email?resend=1"
        ),
        html: expect.stringContaining(
          "https://ivoirebusinessclub.test/auth/verify-email?resend=1"
        ),
      })
    );
    const text = mockSend.mock.calls[0][0].text;
    expect(text).toContain(
      "Vous recevez cet email car vous avez créé un compte sur Ivoire Business Club."
    );
  });

  it("sends reminder PROFILE_COMPLETION with correct link and legal mention", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    const { sendReminderEmail } = await import("./email");

    await sendReminderEmail({
      to: "newmember@example.com",
      name: "Awa",
      type: "PROFILE_COMPLETION",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0][0];
    const text = callArgs.text;
    const html = callArgs.html;

    expect(text).toContain("https://ivoirebusinessclub.test/onboarding/complete-profile");
    expect(text).toContain("complétez votre profil");
    expect(text).toContain(
      "Vous recevez cet email car vous avez créé un compte sur Ivoire Business Club."
    );

    expect(html).toContain("https://ivoirebusinessclub.test/onboarding/complete-profile");
  });

  it("sends reminder FINAL_REMINDER with both links and legal mention", async () => {
    process.env.APP_URL = "https://ivoirebusinessclub.test";
    const { sendReminderEmail } = await import("./email");

    await sendReminderEmail({
      to: "newmember@example.com",
      name: "Awa",
      type: "FINAL_REMINDER",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0][0];
    const text = callArgs.text;
    const html = callArgs.html;

    expect(text).toContain("https://ivoirebusinessclub.test/auth/verify-email?resend=1");
    expect(text).toContain("https://ivoirebusinessclub.test/onboarding/complete-profile");
    expect(text).toContain("finalisé");
    expect(text).toContain(
      "Vous recevez cet email car vous avez créé un compte sur Ivoire Business Club."
    );

    expect(html).toContain("https://ivoirebusinessclub.test/auth/verify-email?resend=1");
    expect(html).toContain("https://ivoirebusinessclub.test/onboarding/complete-profile");
  });

  describe("additional templates and HTML validation", () => {
    beforeEach(() => {
      process.env.APP_URL = "https://ivoirebusinessclub.test";
    });

    it("sends guide email with download link and verified HTML", async () => {
      const { sendGuideEmail } = await import("./email");
      await sendGuideEmail({ to: "member@example.com" });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain("Votre guide gratuit");
      expect(callArgs.text).toContain("https://ivoirebusinessclub.test/guides/Investir");
      expect(callArgs.html).toContain("Télécharger le Guide");
      expect(callArgs.html).toContain("https://ivoirebusinessclub.test/guides/Investir");
    });

    it("sends password reset email with vouvoiement and verified HTML", async () => {
      const { sendPasswordResetEmail } = await import("./email");
      await sendPasswordResetEmail({
        to: "member@example.com",
        name: "Awa",
        token: "reset-token-123",
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toBe("Réinitialiser votre mot de passe - IBC");
      expect(callArgs.text).toContain("Vous avez demandé à réinitialiser votre mot de passe IBC");
      expect(callArgs.text).not.toContain("Tu as demandé");
      expect(callArgs.html).toContain("Réinitialiser mon mot de passe");
      expect(callArgs.html).toContain("reset-password?token=reset-token-123");
    });

    it("sends set password email with correct link and verified HTML", async () => {
      const { sendSetPasswordEmail } = await import("./email");
      await sendSetPasswordEmail({
        to: "member@example.com",
        name: "Awa",
        token: "invite-token-123",
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toBe("Définissez votre mot de passe - Ivoire Business Club");
      expect(callArgs.html).toContain("Définir mon mot de passe");
      expect(callArgs.html).toContain("invite-token-123");
    });

    it("sends password changed email with verified HTML and no redundant signature", async () => {
      const { sendPasswordChangedEmail } = await import("./email");
      await sendPasswordChangedEmail({
        to: "member@example.com",
        name: "Awa",
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toBe("Votre mot de passe a été modifié");
      expect(callArgs.html).toContain("modifié avec succès");
      expect(callArgs.html).not.toContain("Cordialement,<br/>L'équipe");
      expect(callArgs.html).toContain("Cordialement,</p>"); // verifies clean footer handling
    });

    it("sends opportunity verified email with Emerald CTA", async () => {
      const { sendOpportunityVerifiedEmail } = await import("./email");
      await sendOpportunityVerifiedEmail({
        to: "member@example.com",
        name: "Awa",
        opportunityId: "deal-123",
        title: "Super Projet Immo",
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toBe("Votre deal IBC est vérifié");
      expect(callArgs.html).toContain("Super Projet Immo");
      expect(callArgs.html).toContain("Voir le deal");
      expect(callArgs.html).toContain("#2D8B4E"); // Vert Émeraude
    });

    it("sends opportunity matched email with Emerald CTA and French wording", async () => {
      const { sendOpportunityMatchedEmail } = await import("./email");
      await sendOpportunityMatchedEmail({
        to: "member@example.com",
        name: "Awa",
        opportunityId: "deal-123",
        title: "Super Projet Immo",
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toBe("Nouvelle opportunité correspondante : Super Projet Immo");
      expect(callArgs.html).toContain("Nouvelle opportunité correspondante");
      expect(callArgs.html).not.toContain("matchée");
      expect(callArgs.html).toContain("#2D8B4E");
    });

    it("sends opportunity rejected email with correct reason escaping and HTML layout", async () => {
      const { sendOpportunityRejectedEmail } = await import("./email");
      await sendOpportunityRejectedEmail({
        to: "member@example.com",
        name: "Awa",
        opportunityId: "deal-123",
        title: "Projet <Brut>",
        note: "Manque d'infos & de garanties",
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toBe("Votre deal IBC nécessite des corrections");
      expect(callArgs.html).toContain("Projet &lt;Brut&gt;"); // XSS escaping verification
      expect(callArgs.html).toContain("Manque d&#039;infos &amp; de garanties"); // Note escaping verification
      expect(callArgs.html).toContain("Corriger mon deal");
    });
  });

  describe("sendEventRegistrationEmail", () => {
    beforeEach(() => {
      process.env.APP_URL = "https://ivoirebusinessclub.test";
    });

    it("sends event registration email with dual timezone and event details", async () => {
      const { sendEventRegistrationEmail } = await import("./email");

      await sendEventRegistrationEmail({
        to: "member@example.com",
        name: "Awa",
        eventTitle: "Conférence Tech",
        eventSlug: "conference-tech",
        startDate: new Date("2025-07-25T18:00:00Z"),
        endDate: null,
        eventType: "IN_PERSON",
        location: "Abidjan, Côte d'Ivoire",
        onlineUrl: null,
        amountPaid: null,
        payOnSite: true,
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toBe("Votre inscription à l'événement — Conférence Tech");
      expect(callArgs.text).toContain("Conférence Tech");
      expect(callArgs.text).toContain("Date et heure (Paris) :");
      expect(callArgs.text).toContain("Date et heure (Abidjan) :");
      expect(callArgs.text).toContain("Lieu : Abidjan, Côte d'Ivoire");
      expect(callArgs.text).toContain("https://ivoirebusinessclub.test/events/conference-tech");
      expect(callArgs.html).toContain("Conférence Tech");
      expect(callArgs.html).toContain("Lieu : Abidjan");
    });

    it("shows online URL for ONLINE events", async () => {
      const { sendEventRegistrationEmail } = await import("./email");

      await sendEventRegistrationEmail({
        to: "member@example.com",
        name: "Awa",
        eventTitle: "Webinaire IBC",
        eventSlug: "webinaire-ibc",
        startDate: new Date("2025-07-25T18:00:00Z"),
        endDate: null,
        eventType: "ONLINE",
        location: null,
        onlineUrl: "https://zoom.us/j/webinaire",
        amountPaid: null,
        payOnSite: false,
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.text).toContain("Lien : https://zoom.us/j/webinaire");
      expect(callArgs.html).toContain("https://zoom.us/j/webinaire");
    });

    it("shows 'Paiement sur place' when payOnSite is true", async () => {
      const { sendEventRegistrationEmail } = await import("./email");

      await sendEventRegistrationEmail({
        to: "visitor@example.com",
        name: null,
        eventTitle: "Conférence Tech",
        eventSlug: "conference-tech",
        startDate: new Date("2025-07-25T18:00:00Z"),
        endDate: null,
        eventType: "IN_PERSON",
        location: "Abidjan",
        onlineUrl: null,
        amountPaid: null,
        payOnSite: true,
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.text).toContain("Paiement sur place");
      expect(callArgs.html).toContain("Paiement sur place");
    });

    it("shows 'Gratuit' when amountPaid is 0 and not payOnSite", async () => {
      const { sendEventRegistrationEmail } = await import("./email");

      await sendEventRegistrationEmail({
        to: "visitor@example.com",
        name: null,
        eventTitle: "Atelier gratuit",
        eventSlug: "atelier-gratuit",
        startDate: new Date("2025-07-25T18:00:00Z"),
        endDate: null,
        eventType: "ONLINE",
        location: null,
        onlineUrl: "https://zoom.us/j/atelier",
        amountPaid: 0,
        payOnSite: false,
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.text).toContain("Gratuit");
      expect(callArgs.html).toContain("Gratuit");
    });

    it("shows amount when amountPaid > 0", async () => {
      const { sendEventRegistrationEmail } = await import("./email");

      await sendEventRegistrationEmail({
        to: "member@example.com",
        name: "Awa",
        eventTitle: "Conférence Tech",
        eventSlug: "conference-tech",
        startDate: new Date("2025-07-25T18:00:00Z"),
        endDate: null,
        eventType: "IN_PERSON",
        location: "Abidjan",
        onlineUrl: null,
        amountPaid: 10000,
        payOnSite: false,
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.text).toContain("Montant : 10000 XOF");
      expect(callArgs.html).toContain("Montant : 10000 XOF");
    });

    it("includes CTA button to view event", async () => {
      const { sendEventRegistrationEmail } = await import("./email");

      await sendEventRegistrationEmail({
        to: "member@example.com",
        name: "Awa",
        eventTitle: "Conférence Tech",
        eventSlug: "conference-tech",
        startDate: new Date("2025-07-25T18:00:00Z"),
        endDate: null,
        eventType: "IN_PERSON",
        location: "Abidjan",
        onlineUrl: null,
        amountPaid: 10000,
        payOnSite: false,
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain("Voir l'événement");
      expect(callArgs.html).toContain("https://ivoirebusinessclub.test/events/conference-tech");
      expect(callArgs.html).toContain("#2D8B4E");
    });
  });
});

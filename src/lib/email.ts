import { Resend } from "resend";
import { getTierBadgeConfig } from "@/lib/tier-config";
import {
  MOBILE_MONEY_CONFIG,
  formatMobileMoneyReference,
} from "./mobile-money-config";

type SubscriptionEmailBase = {
  to: string;
  name?: string | null;
  tier: string;
};

type SubscriptionRejectedEmailInput = SubscriptionEmailBase & {
  reason: string;
};

type AdminSubscriptionConfirmationEmailInput = SubscriptionEmailBase;

type OpportunityEmailBase = {
  to: string;
  name?: string | null;
  opportunityId: string;
  title: string;
};

type OpportunityRejectedEmailInput = OpportunityEmailBase & {
  note: string;
};

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "";
}

function getAppUrl(customUrl?: string, required = false): string | null {
  const url = customUrl || process.env.APP_URL;
  if (!url) {
    if (required) {
      throw new Error("APP_URL environment variable is not configured");
    }
    return null;
  }
  return url.replace(/\/$/, "");
}

function escapeHtml(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function greeting(name?: string | null) {
  return name?.trim() ? `Bonjour ${name.trim()},` : "Bonjour,";
}

function tierLabel(tier: string) {
  return getTierBadgeConfig(tier).label;
}

function dashboardLine() {
  const appUrl = process.env.APP_URL;
  return appUrl ? `\n\nVotre espace membre : ${appUrl.replace(/\/$/, "")}/dashboard` : "";
}

function opportunityLine(opportunityId: string) {
  const appUrl = process.env.APP_URL;
  return appUrl
    ? `\n\nLien du deal : ${appUrl.replace(/\/$/, "")}/opportunities/${opportunityId}`
    : dashboardLine();
}

function getEmailHtmlWrapper({
  subject,
  contentHtml,
  cta,
  ctaColor = "#1E3A5F", // Navy Blue par défaut
}: {
  subject: string;
  contentHtml: string;
  cta?: { label: string; url: string } | null;
  ctaColor?: string;
}) {
  const ctaHtml = cta
    ? `
<table border="0" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
  <tr>
    <td align="center" bgcolor="${ctaColor}" style="border-radius: 6px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${cta.url}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="12%" stroke="f" fillcolor="${ctaColor}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">${cta.label}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${cta.url}" target="_blank" style="font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 28px; border: 1px solid ${ctaColor}; display: inline-block; font-weight: bold; letter-spacing: 0.5px; background-color: ${ctaColor};">
        ${cta.label}
      </a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`
    : "";

  const appUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, "") : "";
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F5F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F6F5F2; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #1E3A5F; padding: 30px 20px; border-bottom: 3px solid #D4A847;">
              <span style="color: #ffffff; font-family: 'Times New Roman', Times, serif; font-size: 22px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase;">
                Ivoire Business Club
              </span>
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 30px; color: #1A2B4C; font-size: 16px; line-height: 1.6;">
              ${contentHtml}
              ${ctaHtml}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 30px; border-top: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #1E3A5F;">Ivoire Business Club</p>
              <p style="margin: 0 0 15px 0;">Le réseau élite des décideurs et des investisseurs en Côte d'Ivoire.</p>
              ${appUrl ? `<p style="margin: 0 0 15px 0;"><a href="${appUrl}/dashboard" style="color: #1E3A5F; font-weight: bold; text-decoration: underline;">Accéder à mon espace membre</a></p>` : ""}
              <p style="margin: 0 0 10px 0;">L'équipe Ivoire Business Club</p>
              <p style="margin: 0;">Vous recevez cet e-mail dans le cadre de votre adhésion à IBC.</p>
              <p style="margin: 5px 0 0 0;">&copy; ${currentYear} Ivoire Business Club. Tous droits réservés.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  if (!process.env.RESEND_API_KEY || !getFromEmail()) {
    throw new Error(
      "RESEND_API_KEY and RESEND_FROM_EMAIL must be configured for email sending"
    );
  }

  const result = await getResendClient().emails.send({
    from: `Ivoire Business Club <${getFromEmail()}>`,
    to,
    subject,
    text,
    html,
  });

  if (process.env.NODE_ENV !== "test") {
    console.log(`[email] Sent to ${to}: ${subject} (id: ${result.data?.id ?? "n/a"})`);
  }

  return result;
}

export async function sendEmailVerificationEmail({
  to,
  name,
  token,
}: {
  to: string;
  name?: string | null;
  token: string;
}) {
  const appUrl = getAppUrl();
  const verifyLink = `${appUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const subject = "Vérifiez votre adresse email - Ivoire Business Club";
  const text = `${greeting(name)}\n\nMerci de vous être inscrit sur Ivoire Business Club. Veuillez vérifier votre adresse email en cliquant sur le lien suivant :\n\n${verifyLink}\n\nCe lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.`;
  
  const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Merci de vous être inscrit sur Ivoire Business Club. Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
<p style="color: #6B7280; font-size: 14px;">Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>`;

  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    cta: {
      label: "Vérifier mon adresse email",
      url: verifyLink,
    },
  });

  await sendEmail({ to, subject, text, html });
}

export async function sendSubscriptionActivatedEmail({
  to,
  name,
  tier,
}: SubscriptionEmailBase) {
  const label = tierLabel(tier);
  const subject = "Votre abonnement IBC est activé";
  const text = `${greeting(name)}\n\nVotre abonnement IBC ${label} est activé. Bienvenue dans le club !${dashboardLine()}`;

  const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Votre abonnement IBC <strong>${escapeHtml(label)}</strong> est activé. Bienvenue dans le club !</p>`;

  const appUrl = getAppUrl();
  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    ctaColor: "#2D8B4E", // Vert Émeraude pour le succès
    cta: appUrl ? {
      label: "Accéder à mon espace membre",
      url: `${appUrl}/dashboard`,
    } : null,
  });

  await sendEmail({ to, subject, text, html });
}

export async function sendAdminSubscriptionConfirmationEmail({
  to,
  name,
  tier,
}: AdminSubscriptionConfirmationEmailInput) {
  const label = tierLabel(tier);
  const subject = "Votre abonnement IBC est confirmé";
  const text = `${greeting(name)}\n\nVotre abonnement IBC ${label} est bien confirmé. Vous pouvez consulter votre espace membre pour accéder aux avantages de votre plan.${dashboardLine()}`;

  const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Votre abonnement IBC <strong>${escapeHtml(label)}</strong> est bien confirmé. Vous pouvez consulter votre espace membre pour accéder aux avantages de votre plan.</p>`;

  const appUrl = getAppUrl();
  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    ctaColor: "#2D8B4E", // Vert Émeraude
    cta: appUrl ? {
      label: "Accéder à mon espace membre",
      url: `${appUrl}/dashboard`,
    } : null,
  });

  await sendEmail({ to, subject, text, html });
}

export async function sendSubscriptionRejectedEmail({
  to,
  name,
  tier,
  reason,
}: SubscriptionRejectedEmailInput) {
  const label = tierLabel(tier);
  const subject = "Votre demande d'abonnement IBC est refusée";
  const text = `${greeting(name)}\n\nVotre demande d'abonnement IBC ${label} n'a pas pu être validée.\n\nJustification de l'administration :\n${reason}\n\nSi vous pensez qu'il s'agit d'une erreur, contactez le support IBC.${dashboardLine()}`;

  const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Votre demande d'abonnement IBC <strong>${escapeHtml(label)}</strong> n'a pas pu être validée.</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 4px; margin: 25px 0;">
  <tr>
    <td style="padding: 16px 20px;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #991B1B; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Motif de rejet</p>
      <p style="margin: 0; color: #7F1D1D; font-size: 15px; line-height: 1.5;">${escapeHtml(reason)}</p>
    </td>
  </tr>
</table>
<p>Si vous pensez qu'il s'agit d'une erreur, contactez le support IBC.</p>`;

  const appUrl = getAppUrl();
  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    cta: appUrl ? {
      label: "Accéder à mon espace",
      url: `${appUrl}/dashboard`,
    } : null,
  });

  await sendEmail({ to, subject, text, html });
}

export async function sendOpportunityVerifiedEmail({
  to,
  name,
  opportunityId,
  title,
}: OpportunityEmailBase) {
  const subject = "Votre deal IBC est vérifié";
  const text = `${greeting(name)}\n\nVotre deal « ${title} » est maintenant vérifié. Il peut apparaître dans les flux des membres selon les règles d'accès IBC.${opportunityLine(opportunityId)}`;

  const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Votre deal « <strong>${escapeHtml(title)}</strong> » est maintenant vérifié. Il peut apparaître dans le flux des membres selon les règles d'accès IBC.</p>`;

  const appUrl = getAppUrl();
  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    ctaColor: "#2D8B4E", // Vert Émeraude pour le succès
    cta: appUrl ? {
      label: "Voir le deal",
      url: `${appUrl}/opportunities/${opportunityId}`,
    } : null,
  });

  await sendEmail({ to, subject, text, html });
}

export async function sendOpportunityMatchedEmail({
  to,
  name,
  opportunityId,
  title,
}: OpportunityEmailBase) {
  const subject = `Nouvelle opportunité correspondante : ${title}`;
  const text = `${greeting(name)}\n\nNouvelle opportunité correspondante : ${title}${opportunityLine(opportunityId)}`;

  const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Nouvelle opportunité correspondante : <strong>${escapeHtml(title)}</strong></p>`;

  const appUrl = getAppUrl();
  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    ctaColor: "#2D8B4E", // Vert Émeraude pour le succès
    cta: appUrl ? {
      label: "Voir le deal",
      url: `${appUrl}/opportunities/${opportunityId}`,
    } : null,
  });

  await sendEmail({ to, subject, text, html });
}

export async function sendOpportunityRejectedEmail({
  to,
  name,
  opportunityId,
  title,
  note,
}: OpportunityRejectedEmailInput) {
  const subject = "Votre deal IBC nécessite des corrections";
  const text = `${greeting(name)}\n\nVotre deal « ${title} » n'a pas pu être validé en l'état.\n\nNote privée de l'administration :\n${note}\n\nVous pouvez corriger votre dossier depuis votre espace membre.${opportunityLine(opportunityId)}`;

  const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Votre deal « <strong>${escapeHtml(title)}</strong> » n'a pas pu être validé en l'état.</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 4px; margin: 25px 0;">
  <tr>
    <td style="padding: 16px 20px;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #991B1B; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Note de l'administration</p>
      <p style="margin: 0; color: #7F1D1D; font-size: 15px; line-height: 1.5;">${escapeHtml(note)}</p>
    </td>
  </tr>
</table>
<p>Vous pouvez corriger votre dossier depuis votre espace membre.</p>`;

  const appUrl = getAppUrl();
  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    cta: {
      label: "Corriger mon deal",
      url: `${appUrl}/opportunities/${opportunityId}`,
    },
  });

  await sendEmail({ to, subject, text, html });
}

export async function sendWelcomeEmail({
  to,
  name,
  tier,
  paymentProvider = null,
  providerPhone,
  userId,
}: {
  to: string;
  name?: string | null;
  tier: string;
  paymentProvider?: "BANK_TRANSFER" | "WAVE" | "ORANGE_MONEY" | null;
  providerPhone?: string | null;
  userId?: string;
}) {
  const appUrl = getAppUrl();
  const completeProfileLink = `${appUrl}/onboarding/complete-profile`;
  const pricingLink = `${appUrl}/pricing`;

  const iban = process.env.BANK_TRANSFER_IBAN;
  const bic = process.env.BANK_TRANSFER_BIC;
  const bankAddress = process.env.BANK_TRANSFER_BANK_ADDRESS;
  const adhesionContractUrl = process.env.ADHESION_CONTRACT_URL;

  let paymentInstructions = "";
  let paymentInstructionsHtml = "";
  if (paymentProvider === "BANK_TRANSFER" && (iban || bic || bankAddress)) {
    const lines: string[] = [];
    lines.push(
      "Pour finaliser votre adhésion, merci d'effectuer un virement bancaire :"
    );
    if (iban) lines.push(`IBAN : ${iban}`);
    if (bic) lines.push(`BIC : ${bic}`);
    if (bankAddress) lines.push(`Adresse de la banque : ${bankAddress}`);
    paymentInstructions = lines.length > 1 ? "\n\n" + lines.join("\n") : "";

    paymentInstructionsHtml = `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FDFBF7; border: 1px solid #EAE3D2; border-radius: 8px; margin: 25px 0; font-size: 15px;">
  <tr>
    <td style="padding: 24px 20px; color: #1E3A5F;">
      <h4 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; border-bottom: 1px solid #EAE3D2; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #D4A847;">
        Coordonnées de Virement Bancaire
      </h4>
      <p style="margin: 0 0 15px 0; color: #4B5563;">Pour finaliser votre adhésion, merci d'effectuer un virement bancaire :</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 6px 0; font-weight: bold; width: 160px; color: #1E3A5F;">Banque :</td>
          <td style="padding: 6px 0; color: #4B5563;">KS Investment / Société Générale CI</td>
        </tr>
        ${iban ? `<tr>
          <td style="padding: 6px 0; font-weight: bold; color: #1E3A5F;">IBAN :</td>
          <td style="padding: 6px 0;"><span style="font-family: monospace; font-size: 14px; color: #111827; background-color: #F3F4F6; padding: 4px 8px; border-radius: 4px;">${escapeHtml(iban)}</span></td>
        </tr>` : ""}
        ${bic ? `<tr>
          <td style="padding: 6px 0; font-weight: bold; color: #1E3A5F;">BIC / SWIFT :</td>
          <td style="padding: 6px 0;"><span style="font-family: monospace; font-size: 14px; color: #111827; background-color: #F3F4F6; padding: 4px 8px; border-radius: 4px;">${escapeHtml(bic)}</span></td>
        </tr>` : ""}
        ${bankAddress ? `<tr>
          <td style="padding: 6px 0; font-weight: bold; color: #1E3A5F;">Adresse de la banque :</td>
          <td style="padding: 6px 0; color: #4B5563;">${escapeHtml(bankAddress)}</td>
        </tr>` : ""}
      </table>
    </td>
  </tr>
</table>`;
  } else if (paymentProvider === "WAVE" || paymentProvider === "ORANGE_MONEY") {
    const config = MOBILE_MONEY_CONFIG[paymentProvider];
    const lines: string[] = [];
    lines.push(
      `Pour finaliser votre adhésion, merci d'effectuer un paiement ${config.label} :`
    );
    lines.push(`Numéro marchand ${config.label} : ${config.merchantNumber}`);
    if (providerPhone) {
      lines.push(`Depuis votre numéro ${config.label} : ${providerPhone}`);
    }
    if (userId) {
      lines.push(
        `Référence du transfert : ${formatMobileMoneyReference(userId, tier)}`
      );
    }
    lines.push("Instructions :");
    for (const step of config.instructionLines) {
      lines.push(`- ${step}`);
    }
    paymentInstructions = "\n\n" + lines.join("\n");

    paymentInstructionsHtml = `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FDFBF7; border: 1px solid #EAE3D2; border-radius: 8px; margin: 25px 0; font-size: 15px;">
  <tr>
    <td style="padding: 24px 20px; color: #1E3A5F;">
      <h4 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; border-bottom: 1px solid #EAE3D2; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #D4A847;">
        Instructions de Paiement Mobile Money (${config.label})
      </h4>
      <p style="margin: 0 0 15px 0; color: #4B5563;">Pour finaliser votre adhésion, merci d'effectuer un paiement ${config.label} :</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px;">
        <tr>
          <td style="padding: 6px 0; font-weight: bold; width: 180px; color: #1E3A5F;">Numéro marchand :</td>
          <td style="padding: 6px 0;"><span style="font-family: monospace; font-size: 14px; color: #111827; background-color: #F3F4F6; padding: 4px 8px; border-radius: 4px;">${escapeHtml(config.merchantNumber)}</span></td>
        </tr>
        ${providerPhone ? `<tr>
          <td style="padding: 6px 0; font-weight: bold; color: #1E3A5F;">Depuis votre numéro :</td>
          <td style="padding: 6px 0; color: #4B5563;">${escapeHtml(providerPhone)}</td>
        </tr>` : ""}
        ${userId ? `<tr>
          <td style="padding: 6px 0; font-weight: bold; color: #1E3A5F;">Référence du transfert :</td>
          <td style="padding: 6px 0;"><span style="font-family: monospace; font-size: 14px; color: #111827; background-color: #F3F4F6; padding: 4px 8px; border-radius: 4px;">${escapeHtml(formatMobileMoneyReference(userId, tier))}</span></td>
        </tr>` : ""}
      </table>
      <p style="margin: 10px 0 5px 0; font-weight: bold; color: #1E3A5F;">Instructions :</p>
      <ol style="margin: 0; padding-left: 20px; color: #4B5563; line-height: 1.6;">
        ${config.instructionLines.map(step => `<li style="padding: 3px 0;">${escapeHtml(step)}</li>`).join("")}
      </ol>
    </td>
  </tr>
</table>`;
  }

  const contractLine = adhesionContractUrl
    ? `\n\nContrat d'adhésion : ${adhesionContractUrl}`
    : "";

  const completeProfileBlock = completeProfileLink
    ? `\n\nComplétez votre profil : ${completeProfileLink}`
    : "";

  const pricingBlock =
    pricingLink && !paymentProvider
      ? `\n\nChoisissez votre formule d'abonnement dans votre espace membre : ${pricingLink}`
      : "";

  const label = tierLabel(tier);

  const intro = paymentProvider
    ? `Bienvenue sur Ivoire Business Club. Vous avez choisi le tiers ${label}. Votre demande d'abonnement est enregistrée.`
    : `Votre inscription sur Ivoire Business Club est confirmée. Vous démarrez avec le tiers ${label} (plan par défaut). Vous pourrez choisir votre abonnement définitif dans votre espace membre.`;

  const body = `${greeting(name)}\n\n${intro}${completeProfileBlock}${pricingBlock}${paymentInstructions}${contractLine}${dashboardLine()}\n\nL'équipe IBC`;

  const cta = completeProfileLink
    ? { label: "Compléter mon profil", url: completeProfileLink }
    : (pricingLink && !paymentProvider)
    ? { label: "Choisir mon abonnement", url: pricingLink }
    : { label: "Accéder à mon espace", url: `${appUrl}/dashboard` };

  // Inline links only if they aren't duplicate of the main CTA button
  const completeProfileBlockHtml = cta.url !== completeProfileLink
    ? `<p>👉 <a href="${completeProfileLink}" style="color: #1E3A5F; font-weight: bold; text-decoration: underline;">Complétez votre profil</a></p>`
    : "";

  const pricingBlockHtml = !paymentProvider && cta.url !== pricingLink
    ? `<p>👉 <a href="${pricingLink}" style="color: #1E3A5F; font-weight: bold; text-decoration: underline;">Choisissez votre formule d'abonnement dans votre espace membre</a></p>`
    : "";

  const contractLineHtml = adhesionContractUrl
    ? `<p>📄 <a href="${adhesionContractUrl}" style="color: #1E3A5F; font-weight: bold; text-decoration: underline;">Contrat d'adhésion</a></p>`
    : "";

  const subject = "Bienvenue sur Ivoire Business Club — Vos prochaines étapes";
  const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>${intro}</p>
${completeProfileBlockHtml}
${pricingBlockHtml}
${paymentInstructionsHtml}
${contractLineHtml}`;

  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    cta,
  });

  await sendEmail({
    to,
    subject,
    text: body,
    html,
  });
}

export type ReminderType =
  | "EMAIL_VERIFICATION"
  | "PROFILE_COMPLETION"
  | "FINAL_REMINDER";

export async function sendReminderEmail({
  to,
  name,
  type,
}: {
  to: string;
  name?: string | null;
  type: ReminderType;
}) {
  const appUrl = getAppUrl();
  const verifyLink = `${appUrl}/auth/verify-email?resend=1`;
  const profileLink = `${appUrl}/onboarding/complete-profile`;
  const legalMention =
    "Vous recevez cet email car vous avez créé un compte sur Ivoire Business Club.";
  const brandSignature = "\n\nL'équipe Ivoire Business Club";

  if (type === "EMAIL_VERIFICATION") {
    const subject = "Vérifiez votre adresse email — Ivoire Business Club";
    const body = `${greeting(name)}\n\nMerci de vous être inscrit sur Ivoire Business Club. Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le lien ci-dessous :\n\n${verifyLink}\n\nSi le lien ne fonctionne pas, vous pouvez aussi retourner sur la page de vérification et demander un nouvel email.\n\n${legalMention}${brandSignature}`;

    const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Merci de vous être inscrit sur Ivoire Business Club. Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
<p style="color: #6B7280; font-size: 14px;">Si le bouton ne fonctionne pas, vous pouvez aussi retourner sur la page de vérification et demander un nouvel e-mail.</p>`;

    const html = getEmailHtmlWrapper({
      subject,
      contentHtml,
      cta: {
        label: "Vérifier mon adresse email",
        url: verifyLink,
      },
    });

    await sendEmail({
      to,
      subject,
      text: body,
      html,
    });
    return;
  }

  if (type === "PROFILE_COMPLETION") {
    const subject = "Complétez votre profil IBC";
    const body = `${greeting(name)}\n\nVotre inscription avance bien. Pour accéder à l'ensemble des opportunités du club, complétez votre profil en cliquant sur le lien ci-dessous :\n\n${profileLink}\n\nUn profil complet vous permet de matcher avec les deals, les membres et les experts IBC.\n\n${legalMention}${brandSignature}`;

    const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Votre inscription avance bien. Pour accéder à l'ensemble des opportunités du club, complétez votre profil en cliquant sur le bouton ci-dessous :</p>
<p>Un profil complet vous permet de matcher avec les deals, les membres et les experts IBC.</p>`;

    const html = getEmailHtmlWrapper({
      subject,
      contentHtml,
      cta: {
        label: "Compléter mon profil",
        url: profileLink,
      },
    });

    await sendEmail({
      to,
      subject,
      text: body,
      html,
    });
    return;
  }

  // FINAL_REMINDER
  const subject = "Dernier rappel — votre compte IBC n'est pas finalisé";
  const body = `${greeting(name)}\n\nVotre compte Ivoire Business Club n'est pas encore finalisé. Voici les dernières étapes à compléter :\n\n1. Vérifier votre adresse email : ${verifyLink}\n2. Complétez votre profil : ${profileLink}\n\nSous 7 jours, votre accès au club pourra être restreint.\n\n${legalMention}${brandSignature}`;

  const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Votre compte Ivoire Business Club n'est pas encore finalisé. Voici les dernières étapes à compléter :</p>
<ol>
  <li style="margin-bottom: 8px;"><a href="${verifyLink}" style="color: #1E3A5F; font-weight: bold; text-decoration: underline;">Vérifier votre adresse email</a></li>
  <li style="margin-bottom: 8px;"><a href="${profileLink}" style="color: #1E3A5F; font-weight: bold; text-decoration: underline;">Compléter votre profil</a></li>
</ol>
<p style="color: #EF4444; font-weight: bold;">Sous 7 jours, votre accès au club pourra être restreint.</p>`;

  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    cta: {
      label: "Accéder à mon espace",
      url: `${appUrl}/dashboard`,
    },
  });

  await sendEmail({
    to,
    subject,
    text: body,
    html,
  });
}

const GUIDE_FILE_NAME = "Investir en Côte d'Ivoire 2026.pdf";

function guideLink() {
  const appUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, "") : "";
  return `${appUrl}/guides/${encodeURIComponent(GUIDE_FILE_NAME)}`;
}

export async function sendGuideEmail({ to }: { to: string }) {
  const subject = "Votre guide gratuit — Investir en Côte d'Ivoire 2026";
  const text = `Bonjour,\n\nMerci pour votre intérêt pour Ivoire Business Club.\n\nVoici votre guide gratuit « Investir en Côte d'Ivoire 2026 » :\n\n${guideLink()}\n\nBonne lecture,\nL'équipe IBC`;

  const contentHtml = `<p>Bonjour,</p>
<p>Merci pour votre intérêt pour Ivoire Business Club.</p>
<p>Vous pouvez télécharger votre guide gratuit « <strong>Investir en Côte d'Ivoire 2026</strong> » en cliquant sur le bouton ci-dessous :</p>
<p>Bonne lecture,</p>`;

  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    cta: {
      label: "Télécharger le Guide",
      url: guideLink(),
    },
  });

  await sendEmail({
    to,
    subject,
    text,
    html,
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  token,
  appUrl,
}: {
  to: string;
  name?: string | null;
  token: string;
  appUrl?: string;
}) {
  const resolvedAppUrl = getAppUrl(appUrl);
  const resetLink = `${resolvedAppUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const subject = "Réinitialiser votre mot de passe - IBC";
  const text = `${greeting(name)}\n\nVous avez demandé à réinitialiser votre mot de passe IBC. Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :\n\n${resetLink}\n\nCe lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.${dashboardLine()}\n\nL'équipe IBC`;

  const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Vous avez demandé à réinitialiser votre mot de passe Ivoire Business Club. Veuillez cliquer sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
<p style="color: #6B7280; font-size: 14px;">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>`;

  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    cta: {
      label: "Réinitialiser mon mot de passe",
      url: resetLink,
    },
  });

  await sendEmail({ to, subject, text, html });
}

export async function sendSetPasswordEmail({
  to,
  name,
  token,
  appUrl,
}: {
  to: string;
  name?: string | null;
  token: string;
  appUrl?: string;
}) {
  const resolvedAppUrl = getAppUrl(appUrl);
  const inviteLink = `${resolvedAppUrl}/auth/reset-password?token=${encodeURIComponent(token)}&type=set`;
  const subject = "Définissez votre mot de passe - Ivoire Business Club";
  const text = `${greeting(name)}\n\nVous avez été invité à rejoindre l'Ivoire Business Club. Veuillez définir votre mot de passe pour activer votre compte et y accéder de manière autonome :\n\n${inviteLink}\n\nCe lien d'invitation expire dans 7 jours. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.\n\nL'équipe IBC`;

  const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Vous avez été invité à rejoindre l'Ivoire Business Club. Veuillez définir votre mot de passe pour activer votre compte et y accéder de manière autonome :</p>
<p style="color: #6B7280; font-size: 14px;">Ce lien d'invitation expire dans 7 jours. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>`;

  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    cta: {
      label: "Définir mon mot de passe",
      url: inviteLink,
    },
  });

  await sendEmail({ to, subject, text, html });
}

export async function sendPasswordChangedEmail({
  to,
  name,
}: {
  to: string;
  name?: string | null;
}) {
  const subject = "Votre mot de passe a été modifié";
  const text = `${greeting(name)}\n\nNous vous informons que le mot de passe de votre compte Ivoire Business Club a été modifié avec succès.\n\nSi vous n'êtes pas à l'origine de cette modification, veuillez contacter immédiatement notre support.${dashboardLine()}\n\nCordialement,\nL'équipe Ivoire Business Club`;

  const contentHtml = `<p>${greeting(escapeHtml(name))}</p>
<p>Nous vous informons que le mot de passe de votre compte Ivoire Business Club a été modifié avec succès.</p>
<p>Si vous n'êtes pas à l'origine de cette modification, veuillez contacter immédiatement notre support.</p>
<p>Cordialement,</p>`;

  const appUrl = getAppUrl();
  const html = getEmailHtmlWrapper({
    subject,
    contentHtml,
    cta: {
      label: "Accéder à mon espace",
      url: `${appUrl}/dashboard`,
    },
  });

  return sendEmail({ to, subject, text, html });
}



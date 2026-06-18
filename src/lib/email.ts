import nodemailer from "nodemailer";
import { getTierBadgeConfig } from "@/lib/tier-config";

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

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  const host = process.env.MAIL_HOST;
  const port = parseInt(process.env.MAIL_PORT || "587", 10);
  const user = process.env.MAIL_USERNAME;
  const pass = process.env.MAIL_PASSWORD;
  const encryption = process.env.MAIL_ENCRYPTION;

  if (!host || !user || !pass) {
    throw new Error(
      "MAIL_HOST, MAIL_USERNAME, and MAIL_PASSWORD must be configured for email sending"
    );
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: encryption === "tls",
    auth: { user, pass },
  });

  return _transporter;
}

function getSender(): { name: string; address: string } {
  const fromName = process.env.MAIL_FROM_NAME || "Ivoire Business Club";
  const fromAddress =
    process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || "";
  return { name: fromName, address: fromAddress };
}

function greeting(name?: string | null) {
  return name?.trim() ? `Bonjour ${name.trim()},` : "Bonjour,";
}

function tierLabel(tier: string) {
  return getTierBadgeConfig(tier).label;
}

function dashboardLine() {
  const appUrl = process.env.APP_URL;
  return appUrl ? `\n\nVotre espace membre : ${appUrl}/dashboard` : "";
}

function opportunityLine(opportunityId: string) {
  const appUrl = process.env.APP_URL;
  return appUrl
    ? `\n\nLien du deal : ${appUrl}/opportunities/${opportunityId}`
    : dashboardLine();
}

async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const transporter = getTransporter();
  const from = getSender();

  try {
    const result = await transporter.sendMail({
      from,
      to,
      subject,
      text,
    });

    if (process.env.NODE_ENV !== "test") {
      console.log(`[email] Sent to ${to}: ${subject} (id: ${result.messageId})`);
    }

    return result;
  } catch (error) {
    console.error("[email] Failed to send:", error);
    throw error;
  }
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
  const appUrl = process.env.APP_URL || "";
  const verifyLink = `${appUrl}/auth/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: "Vérifiez votre adresse email - Ivoire Business Club",
    text: `${greeting(name)}\n\nMerci de vous être inscrit sur Ivoire Business Club. Veuillez vérifier votre adresse email en cliquant sur le lien suivant :\n\n${verifyLink}\n\nCe lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.`,
  });
}

export async function sendSubscriptionActivatedEmail({
  to,
  name,
  tier,
}: SubscriptionEmailBase) {
  const label = tierLabel(tier);
  await sendEmail({
    to,
    subject: "Votre abonnement IBC est activé",
    text: `${greeting(name)}\n\nVotre abonnement IBC ${label} est activé. Bienvenue dans le club !${dashboardLine()}`,
  });
}

export async function sendAdminSubscriptionConfirmationEmail({
  to,
  name,
  tier,
}: AdminSubscriptionConfirmationEmailInput) {
  const label = tierLabel(tier);
  await sendEmail({
    to,
    subject: "Votre abonnement IBC est confirmé",
    text: `${greeting(name)}\n\nVotre abonnement IBC ${label} est bien confirmé. Vous pouvez consulter votre espace membre pour accéder aux avantages de votre plan.${dashboardLine()}`,
  });
}

export async function sendSubscriptionRejectedEmail({
  to,
  name,
  tier,
  reason,
}: SubscriptionRejectedEmailInput) {
  const label = tierLabel(tier);
  await sendEmail({
    to,
    subject: "Votre demande d'abonnement IBC est refusée",
    text: `${greeting(name)}\n\nVotre demande d'abonnement IBC ${label} n'a pas pu être validée.\n\nJustification de l'administration :\n${reason}\n\nSi vous pensez qu'il s'agit d'une erreur, contactez le support IBC.${dashboardLine()}`,
  });
}

export async function sendOpportunityVerifiedEmail({
  to,
  name,
  opportunityId,
  title,
}: OpportunityEmailBase) {
  await sendEmail({
    to,
    subject: "Votre deal IBC est vérifié",
    text: `${greeting(name)}\n\nVotre deal « ${title} » est maintenant vérifié. Il peut apparaître dans les feeds membres selon les règles d'accès IBC.${opportunityLine(opportunityId)}`,
  });
}

export async function sendOpportunityMatchedEmail({
  to,
  name,
  opportunityId,
  title,
}: OpportunityEmailBase) {
  const message = `Nouvelle opportunité matchée : ${title}`;
  await sendEmail({
    to,
    subject: message,
    text: `${greeting(name)}\n\n${message}${opportunityLine(opportunityId)}`,
  });
}

export async function sendOpportunityRejectedEmail({
  to,
  name,
  opportunityId,
  title,
  note,
}: OpportunityRejectedEmailInput) {
  await sendEmail({
    to,
    subject: "Votre deal IBC nécessite des corrections",
    text: `${greeting(name)}\n\nVotre deal « ${title} » n'a pas pu être validé en l'état.\n\nNote privée de l'administration :\n${note}\n\nVous pouvez corriger votre dossier depuis votre espace membre.${opportunityLine(opportunityId)}`,
  });
}

export async function sendWelcomeEmail({
  to,
  name,
  tier,
}: {
  to: string;
  name?: string | null;
  tier: string;
}) {
  const appUrl = process.env.APP_URL || "";
  const completeProfileLink = appUrl
    ? `${appUrl}/onboarding/complete-profile`
    : "";

  const iban = process.env.BANK_TRANSFER_IBAN;
  const bic = process.env.BANK_TRANSFER_BIC;
  const bankAddress = process.env.BANK_TRANSFER_BANK_ADDRESS;
  const adhesionContractUrl = process.env.ADHESION_CONTRACT_URL;

  let paymentInstructions = "";
  if (iban) {
    const lines: string[] = [];
    lines.push("Pour finaliser votre adhésion, merci d'effectuer un virement bancaire :");
    if (iban) lines.push(`IBAN : ${iban}`);
    if (bic) lines.push(`BIC : ${bic}`);
    if (bankAddress) lines.push(`Adresse de la banque : ${bankAddress}`);
    paymentInstructions = "\n\n" + lines.join("\n");
  }

  const contractLine = adhesionContractUrl
    ? `\n\nContrat d'adhésion : ${adhesionContractUrl}`
    : "";

  const completeProfileBlock = completeProfileLink
    ? `\n\nComplétez votre profil : ${completeProfileLink}`
    : "";

  const label = tierLabel(tier);

  const body = `${greeting(name)}\n\nVotre inscription sur Ivoire Business Club est confirmée. Vous démarrez avec le tier ${label} (plan par défaut). Vous pourrez choisir votre abonnement définitif dans votre espace membre.${completeProfileBlock}${paymentInstructions}${contractLine}${dashboardLine()}\n\nL'équipe IBC`;

  await sendEmail({
    to,
    subject: "Bienvenue sur Ivoire Business Club — Vos prochaines étapes",
    text: body,
  });
}

const GUIDE_FILE_NAME = "Investir en Côte d'Ivoire 2026.pdf";

function guideLink() {
  const appUrl = process.env.APP_URL || "";
  return `${appUrl}/guides/${encodeURIComponent(GUIDE_FILE_NAME)}`;
}

export async function sendGuideEmail({ to }: { to: string }) {
  await sendEmail({
    to,
    subject: "Votre guide gratuit — Investir en Côte d'Ivoire 2026",
    text: `Bonjour,\n\nMerci pour votre intérêt pour Ivoire Business Club.\n\nVoici votre guide gratuit « Investir en Côte d'Ivoire 2026 » :\n\n${guideLink()}\n\nBonne lecture,\nL'équipe IBC`,
  });
}

// Reset transporter (for tests)
export function _resetTransporter() {
  _transporter = null;
}

import { Resend } from "resend";
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

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return new Resend(apiKey);
}

function getSender() {
  return process.env.RESEND_FROM_EMAIL || "IBC <onboarding@resend.dev>";
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
  return appUrl ? `\n\nLien du deal : ${appUrl}/opportunities/${opportunityId}` : dashboardLine();
}

export async function sendSubscriptionActivatedEmail({ to, name, tier }: SubscriptionEmailBase) {
  const label = tierLabel(tier);
  await getResendClient().emails.send({
    from: getSender(),
    to,
    subject: "Votre abonnement IBC est activé",
    text: `${greeting(name)}\n\nVotre abonnement IBC ${label} est activé. Bienvenue dans le club !${dashboardLine()}`,
  });
}

export async function sendAdminSubscriptionConfirmationEmail({ to, name, tier }: AdminSubscriptionConfirmationEmailInput) {
  const label = tierLabel(tier);
  await getResendClient().emails.send({
    from: getSender(),
    to,
    subject: "Votre abonnement IBC est confirmé",
    text: `${greeting(name)}\n\nVotre abonnement IBC ${label} est bien confirmé. Vous pouvez consulter votre espace membre pour accéder aux avantages de votre plan.${dashboardLine()}`,
  });
}

export async function sendSubscriptionRejectedEmail({ to, name, tier, reason }: SubscriptionRejectedEmailInput) {
  const label = tierLabel(tier);
  await getResendClient().emails.send({
    from: getSender(),
    to,
    subject: "Votre demande d'abonnement IBC est refusée",
    text: `${greeting(name)}\n\nVotre demande d'abonnement IBC ${label} n'a pas pu être validée.\n\nJustification de l'administration :\n${reason}\n\nSi vous pensez qu'il s'agit d'une erreur, contactez le support IBC.${dashboardLine()}`,
  });
}

export async function sendOpportunityVerifiedEmail({ to, name, opportunityId, title }: OpportunityEmailBase) {
  await getResendClient().emails.send({
    from: getSender(),
    to,
    subject: "Votre deal IBC est vérifié",
    text: `${greeting(name)}\n\nVotre deal « ${title} » est maintenant vérifié. Il peut apparaître dans les feeds membres selon les règles d'accès IBC.${opportunityLine(opportunityId)}`,
  });
}

export async function sendOpportunityMatchedEmail({ to, name, opportunityId, title }: OpportunityEmailBase) {
  const message = `Nouvelle opportunité matchée : ${title}`;
  await getResendClient().emails.send({
    from: getSender(),
    to,
    subject: message,
    text: `${greeting(name)}\n\n${message}${opportunityLine(opportunityId)}`,
  });
}

export async function sendOpportunityRejectedEmail({ to, name, opportunityId, title, note }: OpportunityRejectedEmailInput) {
  await getResendClient().emails.send({
    from: getSender(),
    to,
    subject: "Votre deal IBC nécessite des corrections",
    text: `${greeting(name)}\n\nVotre deal « ${title} » n'a pas pu être validé en l'état.\n\nNote privée de l'administration :\n${note}\n\nVous pouvez corriger votre dossier depuis votre espace membre.${opportunityLine(opportunityId)}`,
  });
}

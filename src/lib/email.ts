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

export async function sendSubscriptionActivatedEmail({ to, name, tier }: SubscriptionEmailBase) {
  const label = tierLabel(tier);
  await getResendClient().emails.send({
    from: getSender(),
    to,
    subject: "Votre abonnement IBC est activé",
    text: `${greeting(name)}\n\nVotre abonnement IBC ${label} est activé. Bienvenue dans le club !${dashboardLine()}`,
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

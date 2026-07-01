import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SubscriptionActivationNotice } from "@/components/subscription-activation-notice";
import { OnboardingProgressWidget } from "@/components/features/onboarding/onboarding-progress-widget";
import { VerifyResendToast } from "@/components/features/auth/verify-resend-toast";
import { hasActiveSubscription } from "@/lib/subscription-access";
import { PendingSubscriptionBanner } from "@/components/pending-subscription-banner";

const ACTIVATION_NOTICE_DAYS = 7;

function isRecent(date: Date, days: number) {
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const justSignedUp = params["verify-email"] === "1";
  const incomplete = params["incomplete"] === "1";
  const resend = params["resend"] === "1";

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!user) redirect("/auth/signin");

  const onboardingCompleted = user.onboardingCompletedAt !== null;
  const onboardingIncomplete = !user.emailVerified || !onboardingCompleted;
  const showWidget = onboardingIncomplete;
  const subscription = user.subscriptions[0];
  const tierLabel: Record<string, string> = {
    AFFRANCHI: "Les Affranchis",
    GRAND_FRERE: "Les Grands Frères",
    BOSS: "Les Boss",
  };

  const statusLabel: Record<string, string> = {
    TRIAL: "Essai",
    PENDING: "En attente",
    ACTIVE: "Actif",
    PAST_DUE: "En retard",
    CANCELLED: "Annulé",
  };
  const showActivationNotice = subscription?.status === "ACTIVE"
    ? isRecent(subscription.updatedAt, ACTIVATION_NOTICE_DAYS)
    : false;
  const activationNoticeSubscription = showActivationNotice ? subscription : null;
  const showPendingBanner = user.onboardingCompletedAt !== null
    ? user.role !== "ADMIN" ? !(await hasActiveSubscription(user.id)) : false
    : false;

  return (
    <div data-testid="dashboard-page" className="mx-auto max-w-4xl px-4 py-8">
      {justSignedUp ? (
        <p className="mb-4 text-sm font-medium text-muted-foreground">
          📧 Un email de vérification vient de t&apos;être envoyé. Consulte ta boîte de réception !
        </p>
      ) : null}

      {showWidget ? (
        <OnboardingProgressWidget
          emailVerified={user.emailVerified}
          onboardingCompleted={onboardingCompleted}
          priority={incomplete}
        />
      ) : null}

      {resend ? (
        <VerifyResendToast />
      ) : null}

      <h1 data-testid="dashboard-user-name" className="text-2xl font-bold">Bienvenue, {user.name}</h1>
      <p className="mt-1 text-muted-foreground">Ton tableau de bord Ivoire Business Club</p>

      {activationNoticeSubscription ? (
        <SubscriptionActivationNotice
          className="mt-8"
          subscriptionId={activationNoticeSubscription.id}
          tier={activationNoticeSubscription.tier}
          ctaHref="/opportunities"
        />
      ) : null}

      {showPendingBanner ? (
        <PendingSubscriptionBanner tier={user.tier} />
      ) : null}

      <div className="mt-8 rounded-xl border bg-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Mon abonnement</h2>
          <div className="mt-4 grid gap-4 grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p data-testid="dashboard-tier" className="text-lg font-semibold text-primary">
                {subscription ? (tierLabel[user.tier] ?? user.tier) : "Aucun"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <p data-testid="dashboard-subscription-status" className="text-lg font-semibold">
                {subscription ? statusLabel[subscription.status] ?? subscription.status : "Aucun"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expire le</p>
              <p className="text-lg font-semibold">
                {subscription?.endDate
                  ? new Date(subscription.endDate).toLocaleDateString("fr-FR")
                  : "—"}
              </p>
            </div>
          </div>
        </div>
        {!subscription || subscription.status === "TRIAL" ? (
          <div className="flex shrink-0">
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Choisir un plan
            </Link>
          </div>
        ) : null}
      </div>

      {onboardingIncomplete ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-1">
          <Link href="/onboarding/complete-profile" className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-6 hover:shadow-lg transition-shadow">
            <p className="text-lg font-semibold">🔒 Complète ton profil</p>
            <p className="mt-1 text-sm text-muted-foreground">Termine ton onboarding pour débloquer les articles, opportunités et le répertoire des membres</p>
          </Link>
          <Link href="/profile" className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
            <p className="text-lg font-semibold">👤 Mon profil</p>
            <p className="mt-1 text-sm text-muted-foreground">Modifier mes informations</p>
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/articles" className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
            <p className="text-lg font-semibold">📰 Articles</p>
            <p className="mt-1 text-sm text-muted-foreground">Analyses, guides et témoignages</p>
          </Link>
          <Link href="/dashboard/opportunities" className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
            <p className="text-lg font-semibold">🎯 Opportunités</p>
            <p className="mt-1 text-sm text-muted-foreground">Découvrir les opportunités business</p>
          </Link>
          <Link href="/members" className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
            <p className="text-lg font-semibold">🤝 Membres</p>
            <p className="mt-1 text-sm text-muted-foreground">Réseau et mises en relation</p>
          </Link>
          <Link href="/profile" className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
            <p className="text-lg font-semibold">👤 Mon profil</p>
            <p className="mt-1 text-sm text-muted-foreground">Modifier mes informations</p>
          </Link>
        </div>
      )}
    </div>
  );
}
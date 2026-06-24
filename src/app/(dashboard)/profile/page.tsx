import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import AvatarUpload from "@/components/features/auth/avatar-upload";
import ProfileEditForm from "@/components/features/auth/profile-edit-form";
import SubscriptionStatusTracker from "@/components/subscription-status-tracker";
import { SubscriptionActivationNotice } from "@/components/subscription-activation-notice";
import { buildWhatsAppSupportLink } from "@/lib/whatsapp";
import { getTierBadgeConfig } from "@/lib/tier-config";
import SignOutButton from "@/components/auth/sign-out-button";

const SUPPORT_EMAIL = "support@ivoire-business-club.com";
const SUPPORT_THRESHOLD_HOURS = 24;
const ACTIVATION_NOTICE_DAYS = 7;

const subscriptionStatusCopy: Record<string, { title: string; description: string }> = {
  TRIAL: {
    title: "Virement à effectuer",
    description: "Ton compte est prêt. Suis les instructions de virement pour lancer la validation.",
  },
  PENDING: {
    title: "Virement en cours de validation",
    description: "Nous validons votre virement sous 24h. Merci de votre patience.",
  },
  ACTIVE: {
    title: "Abonnement actif",
    description: "Ton accès premium est ouvert. Tu peux consulter les deals vérifiés.",
  },
  CANCELLED: {
    title: "Abonnement annulé",
    description: "Votre abonnement n'est plus actif. Renouvelez pour accéder aux deals premium.",
  },
  PAST_DUE: {
    title: "Paiement à régulariser",
    description: "Ton accès premium est suspendu jusqu'à régularisation.",
  },
};

function isOlderThanHours(date: Date, hours: number) {
  return Date.now() - date.getTime() >= hours * 60 * 60 * 1000;
}

function isRecent(date: Date, days: number) {
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

function buildSupportMessage(providerRef?: string | null) {
  const referenceLine = providerRef ? ` Ma référence d'abonnement est ${providerRef}.` : "";
  return `Bonjour IBC, mon virement est en attente de validation depuis plus de 24h.${referenceLine} Pouvez-vous m'aider s'il vous plaît ?`;
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      image: true,
      phone: true,
      location: true,
      country: true,
      tier: true,
      role: true,
      verificationStatus: true,
      createdAt: true,
      tags: {
        orderBy: [{ category: "asc" }, { value: "asc" }],
        select: { category: true, value: true },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          tier: true,
          status: true,
          providerRef: true,
          createdAt: true,
          updatedAt: true,
          endDate: true,
        },
      },
    },
  });

  if (!user) redirect("/auth/signin");

  const latestSubscription = user.subscriptions[0] ?? null;
  const tierInfo = getTierBadgeConfig(user.tier);
  const formattedDate = user.createdAt.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
  });
  const supportNumber = process.env.SUPPORT_WHATSAPP_NUMBER ?? process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
  const supportLink = latestSubscription?.status === "PENDING"
    ? buildWhatsAppSupportLink({
        phoneNumber: supportNumber,
        message: buildSupportMessage(latestSubscription.providerRef),
      })
    : null;
  const showSupportCta = latestSubscription?.status === "PENDING"
    ? isOlderThanHours(latestSubscription.createdAt, SUPPORT_THRESHOLD_HOURS)
    : false;
  const showActivationNotice = latestSubscription?.status === "ACTIVE"
    ? isRecent(latestSubscription.updatedAt, ACTIVATION_NOTICE_DAYS)
    : false;
  const activationNoticeSubscription = showActivationNotice ? latestSubscription : null;
  const statusCopy = latestSubscription
    ? subscriptionStatusCopy[latestSubscription.status] ?? subscriptionStatusCopy.TRIAL
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Mon profil</h1>
      <p className="mt-1 text-muted-foreground">
        Gère tes informations personnelles
      </p>

      {activationNoticeSubscription ? (
        <SubscriptionActivationNotice
          className="mt-6"
          subscriptionId={activationNoticeSubscription.id}
          tier={activationNoticeSubscription.tier}
          ctaHref="/opportunities"
        />
      ) : null}

      <Card className="mt-6">
        <CardHeader className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <AvatarUpload
            initialImage={user.image}
            userName={user.name}
          />
          <div className="flex-1 text-center sm:text-left">
            <CardTitle className="text-xl">{user.name}</CardTitle>
            <CardDescription className="mt-1">{user.email}</CardDescription>
            <div className="mt-2 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <Badge variant="outline" className={tierInfo.className}>{tierInfo.label}</Badge>
              {user.verificationStatus === "VERIFIED" ? (
                <Badge variant="default" className="bg-green-600 text-white">
                  ✅ Vérifié
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  ⏳ Non vérifié
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Membre depuis {formattedDate}
            </p>
          </div>
        </CardHeader>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Mon abonnement</CardTitle>
          <CardDescription>
            Suis l&apos;avancement de ton abonnement IBC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestSubscription ? (
            <div className="space-y-5">
              <div>
                <Badge variant="outline" className={getTierBadgeConfig(latestSubscription.tier).className}>
                  {getTierBadgeConfig(latestSubscription.tier).label}
                </Badge>
                <h2 className="mt-3 text-lg font-semibold">{statusCopy?.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{statusCopy?.description}</p>
              </div>
              <SubscriptionStatusTracker
                status={latestSubscription.status}
                submittedAt={latestSubscription.createdAt}
                validatedAt={latestSubscription.status === "ACTIVE" ? latestSubscription.updatedAt : null}
                cancelledAt={latestSubscription.status === "CANCELLED" || latestSubscription.status === "PAST_DUE" ? latestSubscription.updatedAt : null}
              />
              {showSupportCta ? (
                supportLink ? (
                  <a
                    href={supportLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Contacter le support
                  </a>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    Le support WhatsApp n&apos;est pas encore configuré. Écris-nous à {SUPPORT_EMAIL} avec ta référence {latestSubscription.providerRef ?? "IBC"}.
                  </div>
                )
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-5 text-sm">
              <p className="font-medium">Aucun abonnement pour le moment</p>
              <p className="mt-1 text-muted-foreground">
                Choisis un tier pour rejoindre le club et accéder aux deals premium.
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Voir les offres
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <Card>
        <CardContent className="pt-6">
          <ProfileEditForm user={user} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAmountForTier } from "@/lib/bank-transfer-config";
import { getTierBadgeConfig } from "@/lib/tier-config";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { AdminSubscriptionActions } from "@/components/admin-subscription-actions";
import { PaymentProviderBadge, type PaymentProvider } from "@/components/payment-provider-badge";
import { redirect } from "next/navigation";

type AdminSubscription = {
  id: string;
  userId: string;
  tier: string;
  provider: PaymentProvider;
  providerPhone: string | null;
  providerRef: string | null;
  status: string;
  createdAt: Date;
  user: { name: string | null; email: string };
};

type PaymentSummary = {
  providerRef: string | null;
  amount: number;
  status: string;
};

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

function formatCurrency(amount: number) {
  return currencyFormatter.format(amount).replace(/\u00a0/g, " ");
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("fr-FR");
}

function getPaymentForSubscription(subscription: AdminSubscription, payments: PaymentSummary[]) {
  return payments.find((payment) => payment.providerRef && payment.providerRef === subscription.providerRef);
}

function SubscriptionTable({
  subscriptions,
  payments,
  emptyLabel,
  showProviderPhone,
}: {
  subscriptions: AdminSubscription[];
  payments: PaymentSummary[];
  emptyLabel: string;
  showProviderPhone: boolean;
}) {
  if (subscriptions.length === 0) {
    return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-4 py-3 font-medium">Membre</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Tier</th>
            <th className="px-4 py-3 font-medium">Montant</th>
            <th className="px-4 py-3 font-medium">Date de soumission</th>
            <th className="px-4 py-3 font-medium">Moyen de paiement</th>
            <th className="px-4 py-3 font-medium">Référence virement</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((subscription) => {
            const payment = getPaymentForSubscription(subscription, payments);
            const amount = payment?.amount ?? getAmountForTier(subscription.tier);
            const tier = getTierBadgeConfig(subscription.tier);
            return (
              <tr key={subscription.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-4 py-4 font-medium">{subscription.user.name || "Membre IBC"}</td>
                <td className="px-4 py-4 text-muted-foreground">{subscription.user.email}</td>
                <td className="px-4 py-4">{tier.label}</td>
                <td className="px-4 py-4">{formatCurrency(amount)}</td>
                <td className="px-4 py-4">{formatDate(subscription.createdAt)}</td>
                <td className="px-4 py-4">
                  <PaymentProviderBadge
                    provider={subscription.provider}
                    providerPhone={showProviderPhone ? subscription.providerPhone : null}
                    showPhone={showProviderPhone}
                  />
                </td>
                <td className="px-4 py-4 font-mono text-xs">
                  {subscription.providerRef || "Référence absente"}
                </td>
                <td className="px-4 py-4">
                  <AdminSubscriptionActions subscriptionId={subscription.id} status={subscription.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminSubscriptionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await promoteConfiguredAdminUser(session.user.id);
  if (admin?.role !== "ADMIN") redirect("/dashboard");

  const [pendingSubscriptions, activeSubscriptions, trialSubscriptions] = await Promise.all([
    prisma.subscription.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.subscription.findMany({
      where: { status: "TRIAL" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const actionableSubscriptions = [...pendingSubscriptions, ...trialSubscriptions];

  const providerRefs = [...actionableSubscriptions, ...activeSubscriptions]
    .map((subscription) => subscription.providerRef)
    .filter((providerRef): providerRef is string => Boolean(providerRef));

  const payments = providerRefs.length
    ? await prisma.payment.findMany({
        where: { providerRef: { in: providerRefs } },
        select: { providerRef: true, amount: true, status: true },
      })
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Administration</p>
          <h1 className="text-2xl font-bold">Validation des abonnements</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Contrôlez les virements bancaires et paiements mobile money reçus, activez les membres validés et suspendez les accès premium si nécessaire.
          </p>
        </div>
        <a
          href="/admin/dashboard"
          className="min-h-11 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ← Retour au tableau de bord
        </a>
      </div>

      <section aria-label="Abonnements à valider" className="mt-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Abonnements à valider</h2>
          <p className="text-sm text-muted-foreground">Abonnements à valider après confirmation du paiement.</p>
        </div>
        <SubscriptionTable
          subscriptions={actionableSubscriptions}
          payments={payments}
          emptyLabel="Aucun abonnement à valider"
          showProviderPhone={true}
        />
      </section>

      <section aria-label="Abonnements actifs" className="mt-10 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Abonnements actifs</h2>
          <p className="text-sm text-muted-foreground">Membres dont l’accès premium est actuellement ouvert.</p>
        </div>
        <SubscriptionTable
          subscriptions={activeSubscriptions}
          payments={payments}
          emptyLabel="Aucun abonnement actif"
          showProviderPhone={false}
        />
      </section>
    </div>
  );
}

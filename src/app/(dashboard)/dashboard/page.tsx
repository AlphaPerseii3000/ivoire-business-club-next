import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!user) redirect("/auth/signin");

  const subscription = user.subscriptions[0];
  const tierLabel: Record<string, string> = {
    AFFRANCHI: "Les Affranchis",
    GRAND_FRERE: "Les Grands Frères",
    BOSS: "Les Boss",
  };

  const statusLabel: Record<string, string> = {
    TRIAL: "Essai",
    ACTIVE: "Actif",
    PAST_DUE: "En retard",
    CANCELLED: "Annulé",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Bienvenue, {user.name}</h1>
      <p className="mt-1 text-muted-foreground">Ton tableau de bord Ivoire Business Club</p>

      {/* Subscription card */}
      <div className="mt-8 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Mon abonnement</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="text-lg font-semibold text-primary">
              {tierLabel[user.tier] ?? user.tier}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Statut</p>
            <p className="text-lg font-semibold">
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
        {(!subscription || subscription.status === "TRIAL") && (
          <a
            href="/pricing"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Choisir un plan
          </a>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <a href="/opportunities" className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
          <p className="text-lg font-semibold">🎯 Opportunités</p>
          <p className="mt-1 text-sm text-muted-foreground">Découvrir les opportunités business</p>
        </a>
        <a href="/members" className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
          <p className="text-lg font-semibold">🤝 Membres</p>
          <p className="mt-1 text-sm text-muted-foreground">Réseau et mises en relation</p>
        </a>
        <a href="/profile" className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
          <p className="text-lg font-semibold">👤 Mon profil</p>
          <p className="mt-1 text-sm text-muted-foreground">Modifier mes informations</p>
        </a>
      </div>
    </div>
  );
}
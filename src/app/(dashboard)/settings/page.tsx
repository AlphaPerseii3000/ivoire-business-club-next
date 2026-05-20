import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DeleteAccountDialog from "@/components/features/auth/delete-account-dialog";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!user) redirect("/auth/signin");

  const subscription = user.subscriptions[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      {/* Subscription management */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Abonnement</h2>
        <div className="mt-4 rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{user.tier === "BOSS" ? "Les Boss" : user.tier === "GRAND_FRERE" ? "Les Grands Frères" : "Les Affranchis"}</p>
              <p className="text-sm text-muted-foreground">
                Statut : {subscription?.status === "ACTIVE" ? "Actif" : subscription?.status === "TRIAL" ? "Essai 14 jours" : "Inactif"}
              </p>
            </div>
            <a href="/pricing" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {subscription?.status === "ACTIVE" ? "Changer de plan" : "S'abonner"}
            </a>
          </div>
          {subscription ? (
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Expire le : {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString("fr-FR") : "—"}</p>
              <p>Provider : {subscription.provider}</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Verification */}
      <section id="verification" className="mt-8">
        <h2 className="text-lg font-semibold">Vérification d&apos;identité</h2>
        <div className="mt-4 rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Le <strong>cachet de conformité</strong> atteste que tu es un acteur vérifié et fiable.
            Réservé aux membres Boss.
          </p>
          {user.verificationStatus === "VERIFIED" ? (
            <p className="mt-4 text-accent font-medium">✅ Identité vérifiée</p>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                Statut actuel : {user.verificationStatus === "PENDING" ? "⏳ En cours de vérification" : "❌ Non vérifié"}
              </p>
              {user.tier === "BOSS" ? (
                user.verificationStatus !== "PENDING" ? (
                  <button className="mt-4 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Demander la vérification
                  </button>
                ) : null
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* Danger zone */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-destructive">Zone de danger</h2>
        <div className="mt-4 rounded-xl border border-destructive/20 bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Supprimer ton compte est irréversible. Toutes tes données seront perdues.
          </p>
          <DeleteAccountDialog />
        </div>
      </section>
    </div>
  );
}
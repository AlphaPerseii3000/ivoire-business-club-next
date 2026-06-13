import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DeleteAccountDialog from "@/components/features/auth/delete-account-dialog";
import ResendVerificationButton from "@/components/features/auth/resend-verification-button";
import { getMissingVerificationPrerequisites, VERIFICATION_LABELS } from "@/lib/verification";

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
        <h2 className="text-lg font-semibold">Vérification de profil</h2>
        <div className="mt-4 rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground font-medium">
            Le <strong>badge de vérification</strong> atteste que tu es un membre vérifié et de confiance de l&apos;Ivoire Business Club.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold">Statut actuel :</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {user.verificationStatus === "VERIFIED"
                  ? "✅ Membre vérifié"
                  : user.verificationStatus === "PENDING"
                  ? "⏳ En attente de vérification"
                  : user.verificationStatus === "EN_COURS"
                  ? "🔄 Vérification en cours — un administrateur validera bientôt ton profil"
                  : user.verificationStatus === "REJECTED"
                  ? "❌ Vérification rejetée"
                  : "Non vérifié"}
              </p>
            </div>

            {(() => {
              const missing = getMissingVerificationPrerequisites(user);
              const hasMissingPrerequisites = missing.length > 0;
              return hasMissingPrerequisites ? (
                <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive space-y-2">
                  <p className="font-semibold">Critères restants pour soumettre à la validation admin :</p>
                  <ul className="list-inside list-disc space-y-1">
                    {missing.map((code) => {
                      const label = VERIFICATION_LABELS[code] || code;
                      return <li key={code}>{label}</li>;
                    })}
                  </ul>
                </div>
              ) : null;
            })()}

            {user.emailVerified === false ? (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <p className="text-sm text-muted-foreground">
                  Ton adresse email n&apos;est pas encore vérifiée. Valide ton compte pour soumettre ton profil à l&apos;administration.
                </p>
                <ResendVerificationButton />
              </div>
            ) : null}
          </div>
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
import { AdminMemberActions } from "@/components/features/admin/admin-member-actions";
import { Badge } from "@/components/ui/badge";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isEligibleForVerification } from "@/lib/verification";
import Link from "next/link";

const tierLabels: Record<string, string> = {
  AFFRANCHI: "Affranchi",
  GRAND_FRERE: "Grand Frère",
  BOSS: "Boss",
};

const accountStatusLabels: Record<string, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
};

const verificationStatusLabels: Record<string, string> = {
  PENDING: "En attente",
  EN_COURS: "En cours",
  VERIFIED: "Vérifié ✓",
  REJECTED: "Rejeté",
};

const verificationBadgeClasses: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  EN_COURS: "bg-blue-100 text-blue-800",
  VERIFIED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

const subscriptionStatusLabels: Record<string, string> = {
  TRIAL: "TRIAL",
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELLED: "CANCELLED",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.at(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams?: Promise<{ incomplete?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const currentAdminId = session.user.id;

  const admin = await promoteConfiguredAdminUser(currentAdminId);
  if (admin?.role !== "ADMIN") redirect("/dashboard");

  const { incomplete } = (await searchParams) ?? {};
  const showIncompleteOnly = incomplete === "1";

  const whereClause = showIncompleteOnly
    ? { OR: [{ emailVerified: false }, { onboardingCompletedAt: null }] }
    : {};

  const members = await prisma.user.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      image: true,
      name: true,
      email: true,
      tier: true,
      status: true,
      verificationStatus: true,
      emailVerified: true,
      onboardingCompletedAt: true,
      bio: true,
      location: true,
      country: true,
      createdAt: true,
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, tier: true, providerRef: true, createdAt: true },
      },
    },
  });

  const hasMembers = members.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Membres</h1>
          <p className="text-sm text-muted-foreground">Gérez les comptes utilisateurs, leur statut et les emails admin.</p>
        </div>
        <a href="/admin/dashboard" className="min-h-11 text-sm text-muted-foreground hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          ← Retour au dashboard
        </a>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {showIncompleteOnly ? (
          <>
            <Badge variant="destructive" className="rounded-full px-3 py-1 text-xs">
              Incomplets uniquement
            </Badge>
            <Link
              href="/admin/members"
              className="min-h-11 inline-flex items-center rounded-md px-3 py-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Voir tous
            </Link>
          </>
        ) : (
          <Link
            href="/admin/members?incomplete=1"
            className="min-h-11 inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Afficher les incomplèts
          </Link>
        )}
      </div>

      {hasMembers ? (
        <div className="mt-6 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium">Membre</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Tier</th>
                <th className="px-4 py-3 text-left font-medium">Abonnement</th>
                <th className="px-4 py-3 text-left font-medium">Statut compte</th>
                <th className="px-4 py-3 text-left font-medium">Vérification</th>
                <th className="px-4 py-3 text-left font-medium">Onboarding</th>
                <th className="px-4 py-3 text-left font-medium">Inscription</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const latestSubscription = member.subscriptions[0] ?? null;
                const subscriptionLabel = latestSubscription
                  ? subscriptionStatusLabels[latestSubscription.status] ?? latestSubscription.status
                  : "Aucun abonnement";
                const accountLabel = accountStatusLabels[member.status] ?? member.status;
                const verificationLabel = verificationStatusLabels[member.verificationStatus] ?? member.verificationStatus;
                const verificationBadge = verificationBadgeClasses[member.verificationStatus] ?? "bg-muted text-muted-foreground";
                const dateLabel = member.createdAt.toLocaleDateString("fr-FR");
                const isCurrentAdmin = member.id === currentAdminId;
                const hasEmail = Boolean(member.email);
                const tierLabel = tierLabels[member.tier] ?? member.tier;
                const accountBadgeClass = member.status === "SUSPENDED" ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-800";
                const eligibility = isEligibleForVerification(member);
                const emailOk = !eligibility.missingPrerequisites.includes("EMAIL_UNVERIFIED");
                const profileOk = !eligibility.missingPrerequisites.includes("BIO_MISSING") && !eligibility.missingPrerequisites.includes("LOCATION_MISSING") && !eligibility.missingPrerequisites.includes("COUNTRY_MISSING");
                const statusOk = !eligibility.missingPrerequisites.includes("ACCOUNT_SUSPENDED");
                const emailVerifiedOk = member.emailVerified === true;
                const profileCompleted = member.onboardingCompletedAt !== null;
                const showEmailBadge = true;
                const showProfileBadge = true;

                return (
                  <tr key={member.id} className="border-b hover:bg-muted/40">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-muted-foreground">
                          {member.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={member.image} alt={`Avatar de ${member.name}`} className="size-full object-cover" />
                          ) : (
                            <span>{initials(member.name)}</span>
                          )}
                        </div>
                        <Link href={`/admin/members/${member.id}`} className="font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                          {member.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{member.email}</td>
                    <td className="px-4 py-4">{tierLabel}</td>
                    <td className="px-4 py-4">{subscriptionLabel}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${accountBadgeClass}`}>{accountLabel}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium self-start ${verificationBadge}`}>{verificationLabel}</span>
                        <div className="flex flex-wrap gap-2 text-[10px] font-medium mt-1">
                          <span
                            className={emailOk ? "text-emerald-700" : "text-muted-foreground/80"}
                            title={emailOk ? "Email vérifié" : "Email non vérifié"}
                          >
                            {emailOk ? "✓ Email" : "✗ Email"}
                          </span>
                          <span
                            className={profileOk ? "text-emerald-700" : "text-muted-foreground/80"}
                            title={profileOk ? "Profil complété" : "Profil incomplet"}
                          >
                            {profileOk ? "✓ Profil" : "✗ Profil"}
                          </span>
                          <span
                            className={statusOk ? "text-emerald-700" : "text-muted-foreground/80"}
                            title={statusOk ? "Compte actif" : "Compte suspendu"}
                          >
                            {statusOk ? "✓ Actif" : "✗ Actif"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {showEmailBadge ? (
                          <Badge
                            variant={emailVerifiedOk ? "default" : "destructive"}
                            className={`rounded-full px-2 py-1 text-xs font-medium ${emailVerifiedOk ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-orange-100 text-orange-800 hover:bg-orange-100"}`}
                          >
                            {emailVerifiedOk ? "Email ✓" : "Email ✗"}
                          </Badge>
                        ) : null}
                        {showProfileBadge ? (
                          <Badge
                            variant={profileCompleted ? "default" : "destructive"}
                            className={`rounded-full px-2 py-1 text-xs font-medium ${profileCompleted ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-orange-100 text-orange-800 hover:bg-orange-100"}`}
                          >
                            {profileCompleted ? "Profil ✓" : "Profil ✗"}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{dateLabel}</td>
                    <td className="px-4 py-4">
                      <AdminMemberActions
                        userId={member.id}
                        status={member.status}
                        verificationStatus={member.verificationStatus}
                        isCurrentAdmin={isCurrentAdmin}
                        hasEmail={hasEmail}
                        canVerifyMember={eligibility.eligible}
                        missingPrerequisites={eligibility.missingPrerequisites}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Aucun utilisateur à afficher pour le moment.
        </div>
      )}
    </div>
  );
}

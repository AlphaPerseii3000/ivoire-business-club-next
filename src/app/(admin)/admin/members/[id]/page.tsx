import { auth } from "@/lib/auth";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AdminMemberReminderButton } from "@/components/features/admin/admin-member-reminder-button";
import { AdminMemberInviteButton } from "@/components/features/admin/admin-member-invite-button";

const verificationStatusLabels: Record<string, string> = {
  PENDING: "En attente",
  EN_COURS: "En cours",
  VERIFIED: "Vérifié ✓",
  REJECTED: "Rejeté",
};

const accountStatusLabels: Record<string, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
};

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await promoteConfiguredAdminUser(session.user.id);
  if (admin?.role !== "ADMIN") redirect("/dashboard");
  if (admin?.status === "SUSPENDED") redirect("/dashboard");

  const { id } = await params;

  const member = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      onboardingCompletedAt: true,
      bio: true,
      location: true,
      country: true,
      status: true,
      verificationStatus: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  if (!member) {
    redirect("/admin/members");
  }

  const dateLabel = member.createdAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const emailVerified = member.emailVerified === true;
  const profileCompleted = member.onboardingCompletedAt !== null;
  const isIncomplete = !emailVerified || !profileCompleted;
  const accountLabel = accountStatusLabels[member.status] ?? member.status;
  const verificationLabel = verificationStatusLabels[member.verificationStatus] ?? member.verificationStatus;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Link
          href="/admin/members"
          className="text-sm text-muted-foreground hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          ← Retour à la liste
        </Link>
      </div>

      <div className="rounded-lg border p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{member.name}</h1>
        <p className="text-sm text-muted-foreground">Inscrit le {dateLabel}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p>{member.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Statut du compte</p>
            <p>{accountLabel}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Vérification</p>
            <p>{verificationLabel}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Localisation</p>
            <p>{member.location ? member.location : "Non renseignée"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Pays</p>
            <p>{member.country ? member.country : "Non renseigné"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Bio</p>
            <p>{member.bio ? member.bio : "Non renseignée"}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Onboarding :</span>
          <Badge
            variant={emailVerified ? "default" : "destructive"}
            className={`rounded-full px-2 py-1 text-xs font-medium ${emailVerified ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-orange-100 text-orange-800 hover:bg-orange-100"}`}
          >
            {emailVerified ? "Email ✓" : "Email ✗"}
          </Badge>
          <Badge
            variant={profileCompleted ? "default" : "destructive"}
            className={`rounded-full px-2 py-1 text-xs font-medium ${profileCompleted ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-orange-100 text-orange-800 hover:bg-orange-100"}`}
          >
            {profileCompleted ? "Profil ✓" : "Profil ✗"}
          </Badge>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isIncomplete ? (
            <AdminMemberReminderButton userId={member.id} disabled={member.status === "SUSPENDED"} />
          ) : null}
          {!emailVerified && member.status !== "SUSPENDED" ? (
            <AdminMemberInviteButton userId={member.id} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

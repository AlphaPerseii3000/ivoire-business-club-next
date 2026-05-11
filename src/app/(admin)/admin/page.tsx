import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") redirect("/dashboard");

  const [totalUsers, totalOpportunities, pendingVerifications, activeSubscriptions] = await Promise.all([
    prisma.user.count(),
    prisma.opportunity.count(),
    prisma.opportunity.count({ where: { verificationStatus: "PENDING" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
  ]);

  const tierDistribution = await prisma.user.groupBy({ by: ["tier"], _count: true });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Administration</h1>
      <p className="mt-1 text-muted-foreground">Tableau de bord administrateur</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Membres</p>
          <p className="text-3xl font-bold">{totalUsers}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Opportunités</p>
          <p className="text-3xl font-bold">{totalOpportunities}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">En attente de vérification</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingVerifications}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Abonnements actifs</p>
          <p className="text-3xl font-bold text-accent">{activeSubscriptions}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {tierDistribution.map((t) => (
          <div key={t.tier} className="rounded-xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">{t.tier === "BOSS" ? "Les Boss" : t.tier === "GRAND_FRERE" ? "Les Grands Frères" : "Les Affranchis"}</p>
            <p className="text-2xl font-bold">{t._count}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <a href="/admin/members" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Gérer les membres
        </a>
        <a href="/admin/opportunities" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
          Vérifier les opportunités
        </a>
      </div>
    </div>
  );
}
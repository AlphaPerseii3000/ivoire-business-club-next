import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Paperclip } from "lucide-react";
import { getUserPremiumAccess } from "@/lib/subscription-access";
import { PremiumAccessBlockedPanel } from "@/components/premium-access-blocked-panel";

export default async function OpportunitiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const access = await getUserPremiumAccess(session.user.id);

  const categoryLabels: Record<string, string> = {
    INVESTISSEMENT: "Investissement",
    BUSINESS: "Business",
    PARTENARIAT: "Partenariat",
    IMMOBILIER: "Immobilier",
  };

  const statusLabels: Record<string, string> = {
    PENDING: "⏳ En attente",
    VERIFIED: "✅ Vérifié",
    REJECTED: "❌ Refusé",
  };

  if (!access.hasAccess) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Opportunités</h1>
            <p className="mt-1 text-muted-foreground">
              Découvre des opportunités business en Afrique
            </p>
          </div>
          <Link
            href="/dashboard/opportunities/new"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            + Publier
          </Link>
        </div>
        <PremiumAccessBlockedPanel />
      </div>
    );
  }

  const opportunities = await prisma.opportunity.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true, id: true } }, _count: { select: { documents: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Opportunités</h1>
          <p className="mt-1 text-muted-foreground">
            Découvre des opportunités business en Afrique
          </p>
        </div>
        <Link
          href="/dashboard/opportunities/new"
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          + Publier
        </Link>
      </div>

      {opportunities.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          <p className="text-lg">Aucune opportunité pour le moment</p>
          <p className="mt-2 text-sm">Sois le premier à publier !</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {opportunities.map((opp) => (
            <a
              key={opp.id}
              href={`/dashboard/opportunities/${opp.id}`}
              className="block rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{opp.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{opp.description}</p>
                </div>
                {opp.amount ? (
                  <span className="ml-4 rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary whitespace-nowrap">
                    {opp.amount.toLocaleString("fr-FR")} €
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-1">{categoryLabels[opp.category] ?? opp.category}</span>
                <span>{statusLabels[opp.verificationStatus] ?? opp.verificationStatus}</span>
                <span>Par {opp.author.name}</span>
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                  {opp._count?.documents ?? 0}
                </span>
                <span>{new Date(opp.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
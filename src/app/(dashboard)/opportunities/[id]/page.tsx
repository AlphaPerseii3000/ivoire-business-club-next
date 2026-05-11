import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { id } = await params;

  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      author: { select: { name: true, id: true, location: true } },
      verifiedBy: { select: { name: true } },
    },
  });

  if (!opportunity) notFound();

  const categoryLabels: Record<string, string> = {
    INVESTISSEMENT: "Investissement",
    BUSINESS: "Business",
    PARTENARIAT: "Partenariat",
    IMMOBILIER: "Immobilier",
  };

  const statusLabels: Record<string, { text: string; color: string }> = {
    PENDING: { text: "En attente de vérification", color: "text-yellow-600" },
    VERIFIED: { text: "Vérifié ✓", color: "text-accent" },
    REJECTED: { text: "Refusé", color: "text-destructive" },
  };

  const status = statusLabels[opportunity.verificationStatus] ?? { text: opportunity.verificationStatus, color: "" };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <a href="/opportunities" className="text-sm text-muted-foreground hover:text-primary">← Retour aux opportunités</a>

      <div className="mt-6">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{opportunity.title}</h1>
          <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
        </div>

        <div className="mt-4 flex gap-3">
          <span className="rounded-md bg-muted px-3 py-1 text-sm">{categoryLabels[opportunity.category] ?? opportunity.category}</span>
          {opportunity.amount && (
            <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {opportunity.amount.toLocaleString("fr-FR")} €
            </span>
          )}
        </div>

        <div className="mt-6 rounded-xl border bg-card p-6">
          <p className="whitespace-pre-wrap">{opportunity.description}</p>
        </div>

        <div className="mt-6 rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Auteur</h2>
          <p className="mt-1 text-sm">{opportunity.author.name}{opportunity.author.location ? ` — ${opportunity.author.location}` : ""}</p>
          <p className="mt-1 text-xs text-muted-foreground">Publié le {new Date(opportunity.createdAt).toLocaleDateString("fr-FR")}</p>
          {opportunity.verifiedBy && (
            <p className="mt-2 text-xs text-accent">Vérifié par {opportunity.verifiedBy.name}</p>
          )}
        </div>

        {session.user.id === opportunity.author.id && (
          <div className="mt-6">
            <form action={`/api/opportunities/${opportunity.id}/delete`} method="POST">
              <button type="submit" className="rounded-md border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
                Supprimer cette opportunité
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
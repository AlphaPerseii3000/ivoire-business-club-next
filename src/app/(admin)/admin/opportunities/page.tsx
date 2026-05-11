import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminOpportunitiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") redirect("/dashboard");

  const opportunities = await prisma.opportunity.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true, email: true } } },
  });

  const categoryLabels: Record<string, string> = {
    INVESTISSEMENT: "Investissement",
    BUSINESS: "Business",
    PARTENARIAT: "Partenariat",
    IMMOBILIER: "Immobilier",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vérification des opportunités</h1>
        <a href="/admin" className="text-sm text-muted-foreground hover:text-primary">← Retour</a>
      </div>

      <div className="mt-8 space-y-4">
        {opportunities.map((opp) => (
          <div key={opp.id} className="rounded-xl border bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{opp.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{opp.description}</p>
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-1">{categoryLabels[opp.category] ?? opp.category}</span>
                  <span>Par {opp.author.name} ({opp.author.email})</span>
                  <span>{new Date(opp.createdAt).toLocaleDateString("fr-FR")}</span>
                  {opp.amount && <span>{opp.amount.toLocaleString("fr-FR")} €</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {opp.verificationStatus === "PENDING" && (
                  <>
                    <form action={`/api/admin/opportunities/${opp.id}/verify`} method="POST" style={{ display: "inline" }}>
                      <button type="submit" name="action" value="approve" className="rounded-md bg-accent px-3 py-1 text-sm text-accent-foreground hover:bg-accent/90">✅ Approuver</button>
                    </form>
                    <form action={`/api/admin/opportunities/${opp.id}/verify`} method="POST" style={{ display: "inline" }}>
                      <button type="submit" name="action" value="reject" className="rounded-md border border-destructive px-3 py-1 text-sm text-destructive hover:bg-destructive/10">❌ Refuser</button>
                    </form>
                  </>
                )}
                {opp.verificationStatus === "VERIFIED" && <span className="text-sm text-accent">✅ Vérifié</span>}
                {opp.verificationStatus === "REJECTED" && <span className="text-sm text-destructive">❌ Refusé</span>}
              </div>
            </div>
          </div>
        ))}

        {opportunities.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            Aucune opportunité pour le moment
          </div>
        )}
      </div>
    </div>
  );
}
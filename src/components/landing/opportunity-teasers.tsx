import Link from "next/link";
import { LockKeyhole, MapPin } from "lucide-react";

type OpportunityTeaser = {
  id: string;
  title: string;
  location?: string | null;
};

type OpportunityTeasersProps = {
  opportunities: OpportunityTeaser[];
  title?: string;
  description?: string;
};

export function OpportunityTeasers({
  opportunities,
  title = "Aperçu des opportunités vérifiées",
  description = "Quelques deals sont visibles publiquement. Les détails restent réservés aux membres actifs.",
}: OpportunityTeasersProps) {
  return (
    <section id="opportunites" className="bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Deals teaser</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{title}</h2>
          <p className="mt-4 text-muted-foreground">{description}</p>
        </div>

        {opportunities.length > 0 ? (
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {opportunities.map((opportunity) => {
              const location = opportunity.location?.trim() ? opportunity.location : "Localisation non renseignée";
              return (
                <Link
                  key={opportunity.id}
                  href="/auth/signup"
                  className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="space-y-3 blur-[1px] transition group-hover:blur-0">
                    <h3 className="text-lg font-semibold">{opportunity.title}</h3>
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {location}
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4 text-center backdrop-blur-[1px] transition group-hover:bg-background/70">
                    <div className="rounded-xl border bg-card/95 p-4 shadow-sm">
                      <LockKeyhole className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
                      <p className="mt-2 text-sm font-semibold">Devenez membre pour voir les détails</p>
                      <p className="mt-1 text-xs text-muted-foreground">Inscription gratuite, activation par virement.</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed bg-card p-8 text-center text-muted-foreground">
            Aucun teaser vérifié disponible pour le moment.
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/opportunities"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary px-5 py-2 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Voir tous les teasers
          </Link>
        </div>
      </div>
    </section>
  );
}

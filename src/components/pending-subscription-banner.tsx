import Link from "next/link";

const TIER_LABELS: Record<string, string> = {
  AFFRANCHI: "Les Affranchis",
  GRAND_FRERE: "Les Grands Frères",
  BOSS: "Les Boss",
};

export function PendingSubscriptionBanner({ tier }: { tier: string }) {
  const label = TIER_LABELS[tier] ?? tier;
  return (
    <section
      aria-label="Abonnement en attente d'activation"
      data-testid="pending-subscription-banner"
      className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <h2 className="text-lg font-semibold">Votre offre {label} est en attente d'activation</h2>
      <p className="mt-2 text-sm">Finalisez votre paiement pour débloquer les opportunités business, le matching et les profils membres.</p>
      <Link
        href={`/pricing/virement?tier=${tier}`}
        data-testid="pending-subscription-cta"
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Finaliser mon paiement
      </Link>
    </section>
  );
}

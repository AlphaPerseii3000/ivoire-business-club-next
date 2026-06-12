import Link from "next/link";

export function PremiumAccessBlockedPanel() {
  return (
    <section
      aria-label="Accès premium bloqué"
      data-testid="premium-blocked-panel"
      className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <h2 className="text-lg font-semibold">Accès réservé aux membres actifs</h2>
      <p className="mt-2 text-sm">
        Votre abonnement est inactif. Renouvelez pour accéder aux deals.
      </p>
      <Link
        href="/pricing"
        data-testid="upgrade-cta"
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Voir les offres
      </Link>
    </section>
  );
}

import Link from "next/link";

import { AdminMetricsCards } from "@/components/features/admin/admin-metrics-cards";
import { getAdminAnalyticsMetrics } from "@/lib/admin-analytics";

export async function AdminDashboard() {
  const metrics = await getAdminAnalyticsMetrics();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Administration</p>
          <h1 className="text-2xl font-bold">Tableau de bord analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Suivez les indicateurs clés de croissance, d’activité et de qualité de la plateforme IBC.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/opportunities"
            className="min-h-11 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Vérifier les opportunités
          </Link>
          <Link
            href="/admin/events"
            className="min-h-11 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Gérer les événements
          </Link>
          <Link
            href="/admin/companies"
            className="min-h-11 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Gérer les entreprises
          </Link>
          <Link
            href="/admin/subscriptions"
            className="min-h-11 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Gérer les abonnements
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <AdminMetricsCards metrics={metrics} />
      </div>
    </div>
  );
}

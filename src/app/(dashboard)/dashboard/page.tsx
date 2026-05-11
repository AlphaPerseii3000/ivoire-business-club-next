export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Bienvenue sur IBC</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Mon abonnement</p>
          <p className="mt-1 text-2xl font-bold">Affranchi</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Opportunités disponibles</p>
          <p className="mt-1 text-2xl font-bold">--</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Membres actifs</p>
          <p className="mt-1 text-2xl font-bold">--</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold">Dernières opportunités</h3>
        <p className="mt-2 text-muted-foreground">Aucune opportunité pour le moment.</p>
      </div>
    </div>
  );
}

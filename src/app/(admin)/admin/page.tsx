export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard Admin</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Membres totaux</p>
          <p className="mt-1 text-2xl font-bold">--</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Abonnements actifs</p>
          <p className="mt-1 text-2xl font-bold">--</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Opportunités en attente</p>
          <p className="mt-1 text-2xl font-bold">--</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Revenus ce mois</p>
          <p className="mt-1 text-2xl font-bold">--</p>
        </div>
      </div>
    </div>
  );
}

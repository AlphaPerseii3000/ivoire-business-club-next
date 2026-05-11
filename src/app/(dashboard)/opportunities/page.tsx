export default function OpportunitiesPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Opportunités</h2>
        <a href="/opportunities/new" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
          Publier une opportunité
        </a>
      </div>
      <p className="mt-4 text-muted-foreground">Aucune opportunité pour le moment.</p>
    </div>
  );
}

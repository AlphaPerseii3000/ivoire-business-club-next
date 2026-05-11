export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <a href="/" className="text-xl font-bold text-primary">
            Ivoire Business Club
          </a>
          <nav className="flex gap-6 text-sm">
            <a href="/pricing" className="hover:text-primary">Tarifs</a>
            <a href="/auth/signin" className="hover:text-primary">Connexion</a>
            <a href="/auth/signup" className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
              Rejoins le club
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Bâtir son futur en <span className="text-primary">Afrique</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Avec l&apos;Ivoire Business Club, accède aux meilleures opportunités business en Côte d&apos;Ivoire
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <a href="/auth/signup" className="rounded-md bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90">
              Rejoins le club
            </a>
            <a href="/pricing" className="rounded-md border px-6 py-3 hover:bg-muted">
              Voir les tarifs
            </a>
          </div>
        </section>
      </main>
      <footer className="border-t bg-card py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Ivoire Business Club. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}

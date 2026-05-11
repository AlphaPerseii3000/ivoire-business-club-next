export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <a href="/" className="text-xl font-bold text-primary">Ivoire Business Club</a>
          <nav className="flex gap-6 text-sm">
            <a href="/auth/signin" className="hover:text-primary">Connexion</a>
            <a href="/auth/signup" className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">Rejoins le club</a>
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-7xl px-4 py-16">
        <h1 className="text-3xl font-bold text-center">Nos formules</h1>
        <p className="mt-4 text-center text-muted-foreground">Choisis le plan qui correspond à ton ambition</p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {/* Affranchi */}
          <div className="rounded-2xl border p-8">
            <h2 className="text-xl font-bold">Affranchi</h2>
            <p className="mt-4 text-3xl font-bold">29€<span className="text-sm text-muted-foreground">/mois</span></p>
            <ul className="mt-6 space-y-2 text-sm">
              <li>✅ Accès à l&apos;annuaire des membres</li>
              <li>✅ Opportunités en lecture</li>
              <li>✅ Événements mensuels</li>
              <li>❌ Mise en relation directe</li>
              <li>❌ Opportunités vérifiées</li>
            </ul>
            <a href="/auth/signup" className="mt-8 block rounded-md border py-2 text-center text-sm hover:bg-muted">Commencer</a>
          </div>
          {/* Grand Frère — recommended */}
          <div className="rounded-2xl border-2 border-primary p-8 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Recommandé</span>
            <h2 className="text-xl font-bold">Grand Frère</h2>
            <p className="mt-4 text-3xl font-bold">79€<span className="text-sm text-muted-foreground">/mois</span></p>
            <ul className="mt-6 space-y-2 text-sm">
              <li>✅ Tout d&apos;Affranchi</li>
              <li>✅ Mise en relation directe</li>
              <li>✅ Opportunités vérifiées</li>
              <li>✅ Mentorat</li>
              <li>❌ Accès VIP</li>
            </ul>
            <a href="/auth/signup" className="mt-8 block rounded-md bg-primary py-2 text-center text-sm text-primary-foreground hover:bg-primary/90">Commencer</a>
          </div>
          {/* Boss */}
          <div className="rounded-2xl border p-8">
            <h2 className="text-xl font-bold">Boss</h2>
            <p className="mt-4 text-3xl font-bold">199€<span className="text-sm text-muted-foreground">/mois</span></p>
            <ul className="mt-6 space-y-2 text-sm">
              <li>✅ Tout de Grand Frère</li>
              <li>✅ Accès VIP événements</li>
              <li>✅ Publication d&apos;opportunités</li>
              <li>✅ Priorité mise en relation</li>
              <li>✅ Support dédié</li>
            </ul>
            <a href="/auth/signup" className="mt-8 block rounded-md border py-2 text-center text-sm hover:bg-muted">Commencer</a>
          </div>
        </div>
      </main>
    </div>
  );
}

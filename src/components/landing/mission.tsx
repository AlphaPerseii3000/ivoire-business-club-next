export function Mission() {
  const pillars = [
    { title: "Créer des ponts", desc: "Entre l'Europe et l'Afrique, nous connectons les acteurs qui comptent." },
    { title: "Opportunités fiables", desc: "Accès à des opportunités vérifiées et concrètes." },
    { title: "Valoriser les locaux", desc: "Les acteurs locaux sont au cœur de notre écosystème." },
    { title: "Communauté forte", desc: "Un réseau solidaire, structuré et orienté résultats." },
  ];

  return (
    <section id="mission" className="py-20 bg-card">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-3xl font-bold">Notre mission</h2>
        <p className="mt-4 text-center text-muted-foreground">
          Construire le pont entre l&apos;Europe et l&apos;Afrique
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-xl border bg-background p-6 text-center hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-primary">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

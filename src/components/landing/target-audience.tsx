export function TargetAudience() {
  const audiences = [
    { title: "Investisseurs", desc: "Découvre le potentiel réel du marché et accède à des opportunités vérifiées.", icon: "📈" },
    { title: "Entrepreneurs", desc: "Gagne en visibilité, crédibilité et connecte-toi aux bonnes personnes.", icon: "🚀" },
    { title: "Acteurs locaux", desc: "Accède à des clients, développe ton réseau et ton activité.", icon: "🤝" },
  ];
  return (
    <section className="py-20 bg-card">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-3xl font-bold">C&apos;est pour toi si…</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.title} className="rounded-xl border bg-background p-8 hover:shadow-lg transition-shadow">
              <div className="text-4xl">{a.icon}</div>
              <h3 className="mt-4 text-xl font-semibold">{a.title}</h3>
              <p className="mt-2 text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

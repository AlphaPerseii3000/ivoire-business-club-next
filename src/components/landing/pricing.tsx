const tiers = [
  {
    name: "Les Affranchis",
    subtitle: "Parfait pour démarrer",
    monthlyEur: 29,
    monthlyCfa: 10000,
    annualEur: 290,
    annualCfa: 100000,
    features: [
      "Accès à la communauté",
      "Visibilité sur les opportunités",
      "Accès aux événements (payant)",
    ],
    highlighted: false,
  },
  {
    name: "Les Grands Frères",
    subtitle: "Pour faire du business activement",
    monthlyEur: 59,
    monthlyCfa: 25000,
    annualEur: 590,
    annualCfa: 250000,
    features: [
      "Tout le contenu Affranchi",
      "Visibilité sur notre plateforme",
      "Mises en relation ciblées",
      "Accès prioritaire aux événements",
      "Accès illimité aux opportunités",
    ],
    highlighted: true,
  },
  {
    name: "Les Boss",
    subtitle: "Pour investisseurs et acteurs clés",
    monthlyEur: 99,
    monthlyCfa: 50000,
    annualEur: 990,
    annualCfa: 500000,
    features: [
      "Tout le contenu Grands Frères",
      "Accès prioritaire aux projets qualifiés",
      "Événements exclusifs",
      "1h/mois d'accompagnement offert",
      "Cachet de conformité inclus",
      "Accès direct aux entreprises",
    ],
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-3xl font-bold">Nos offres</h2>
        <p className="mt-4 text-center text-muted-foreground">
          🎁 Offre de lancement : <strong>-50% sur l&apos;annuel</strong> ou <strong>1 mois offert</strong> en mensuel
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-8 ${
                tier.highlighted ? "border-2 border-primary shadow-xl scale-105" : ""
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                  Recommandé
                </span>
              )}
              <h3 className="text-xl font-bold">{tier.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tier.subtitle}</p>
              <p className="mt-4">
                <span className="text-3xl font-bold">{tier.monthlyEur}€</span>
                <span className="text-muted-foreground">/mois</span>
              </p>
              <p className="text-sm text-muted-foreground">
                ou {tier.monthlyCfa.toLocaleString("fr-FR")} CFA/mois
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Annuel : {tier.annualEur}€ / {tier.annualCfa.toLocaleString("fr-FR")} CFA
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-accent">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href="/auth/signup"
                className={`mt-8 block rounded-md py-2 text-center text-sm font-semibold transition-colors ${
                  tier.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border hover:bg-muted"
                }`}
              >
                Commencer
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

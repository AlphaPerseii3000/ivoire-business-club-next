"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

const tiers = [
  {
    key: "AFFRANCHI" as const,
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
    key: "GRAND_FRERE" as const,
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
    key: "BOSS" as const,
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

export default function PricingPage() {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [currency, setCurrency] = useState<"eur" | "cfa">("eur");
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <a href="/" className="text-xl font-bold text-primary">IBC</a>
          <nav className="flex gap-6 text-sm">
            <a href="/auth/signin" className="hover:text-primary">Connexion</a>
            <a href="/auth/signup" className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">Rejoins le club</a>
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-7xl px-4 py-16">
        <h1 className="text-3xl font-bold text-center">Nos offres</h1>
        <p className="mt-4 text-center text-muted-foreground">Choisis le plan qui correspond à ton ambition</p>

        {/* Toggle period + currency */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <div className="inline-flex rounded-md border">
            <button onClick={() => setPeriod("monthly")} className={`px-4 py-2 text-sm ${period === "monthly" ? "bg-primary text-primary-foreground" : ""}`}>Mensuel</button>
            <button onClick={() => setPeriod("annual")} className={`px-4 py-2 text-sm ${period === "annual" ? "bg-primary text-primary-foreground" : ""}`}>Annuel (-50% lancement 🎁)</button>
          </div>
          <div className="inline-flex rounded-md border">
            <button onClick={() => setCurrency("eur")} className={`px-4 py-2 text-sm ${currency === "eur" ? "bg-secondary text-secondary-foreground" : ""}`}>€</button>
            <button onClick={() => setCurrency("cfa")} className={`px-4 py-2 text-sm ${currency === "cfa" ? "bg-secondary text-secondary-foreground" : ""}`}>CFA</button>
          </div>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => {
            const price = period === "monthly"
              ? (currency === "eur" ? tier.monthlyEur : tier.monthlyCfa)
              : (currency === "eur" ? tier.annualEur : tier.annualCfa);
            const unit = currency === "eur" ? "€" : "CFA";
            const periodLabel = period === "monthly" ? "/mois" : "/an";

            return (
              <div key={tier.key} className={`relative rounded-2xl border p-8 ${tier.highlighted ? "border-2 border-primary shadow-xl scale-105" : ""}`}>
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                    Recommandé
                  </span>
                )}
                <h2 className="text-xl font-bold">{tier.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{tier.subtitle}</p>
                <p className="mt-4">
                  <span className="text-3xl font-bold">{price.toLocaleString("fr-FR")}{unit}</span>
                  <span className="text-muted-foreground">{periodLabel}</span>
                </p>
                <ul className="mt-6 space-y-2 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-accent">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href="/auth/signup" className={`mt-8 block rounded-md py-2 text-center text-sm font-semibold transition-colors ${tier.highlighted ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border hover:bg-muted"}`}>
                  Commencer
                </a>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

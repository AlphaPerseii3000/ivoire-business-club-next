"use client";

import { useState } from "react";

const CATEGORIES = [
  { value: "INVESTISSEMENT", label: "Investissement" },
  { value: "BUSINESS", label: "Business" },
  { value: "PARTENARIAT", label: "Partenariat" },
  { value: "IMMOBILIER", label: "Immobilier" },
];

export default function NewOpportunityPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("BUSINESS");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          amount: amount ? parseFloat(amount) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de la création");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError("Erreur réseau");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-2xl font-bold text-accent">✅ Opportunité publiée !</p>
        <p className="mt-2 text-muted-foreground">Elle sera vérifiée par un admin avant d&apos;être visible publiquement.</p>
        <a href="/opportunities" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
          Voir les opportunités
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Publier une opportunité</h1>
      <p className="mt-1 text-muted-foreground">Partage une opportunité business avec la communauté</p>

      {error && <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">Titre</label>
          <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Ex: Restaurant franchise à Abidjan" />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium">Catégorie</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium">Montant (€, optionnel)</label>
          <input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="50000" />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">Description</label>
          <textarea id="description" required rows={6} value={description} onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Décris l'opportunité en détail..." />
        </div>

        <button type="submit" disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {loading ? "Publication..." : "Publier l'opportunité"}
        </button>
      </form>
    </div>
  );
}
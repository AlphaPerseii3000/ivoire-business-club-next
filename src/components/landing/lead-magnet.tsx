"use client";

import { useState } from "react";

export function LeadMagnet() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Send email to API
    setSubmitted(true);
  };

  return (
    <section className="py-20 bg-gradient-to-r from-primary/10 to-accent/10">
      <div className="mx-auto max-w-7xl px-4 text-center">
        <h2 className="text-3xl font-bold">Guide gratuit : Investir en CI 2026</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Télécharge notre guide et découvre les opportunités les plus prometteuses en Côte d&apos;Ivoire.
        </p>
        {submitted ? (
          <p className="mt-8 text-lg font-semibold text-primary">
            ✅ Merci ! Vérifie ta boîte email.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="flex-1 rounded-md border bg-background px-4 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Télécharger
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

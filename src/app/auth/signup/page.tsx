"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { getOAuthErrorMessage } from "@/lib/oauth-errors";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const displayError = error || (urlError ? getOAuthErrorMessage(urlError) : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de l'inscription");
        setLoading(false);
        return;
      }

      // Auto sign in after signup
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.ok) {
        window.location.href = "/pricing";
      } else {
        window.location.href = "/auth/signin";
      }
    } catch {
      setError("Erreur réseau");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = useCallback(() => {
    setGoogleLoading(true);
    setError("");
    signIn("google", { callbackUrl: "/dashboard" });
  }, [setGoogleLoading, setError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Créer un compte</h1>
          <p className="mt-2 text-sm text-muted-foreground">Rejoins l&apos;Ivoire Business Club</p>
        </div>
        {displayError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{displayError}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">Nom complet</label>
            <input id="name" name="name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Jean Dupont" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="ton@email.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Mot de passe</label>
            <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="••••••••" />
            <p className="mt-1 text-xs text-muted-foreground">Minimum 8 caractères</p>
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
        </div>
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full rounded-md border py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {googleLoading ? "Connexion en cours..." : "Continuer avec Google"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Déjà membre ?{" "}
          <a href="/auth/signin" className="text-primary hover:underline">Se connecter</a>
        </p>
      </div>
    </div>
  );
}

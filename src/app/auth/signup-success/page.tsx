"use client";

import Link from "next/link";

export default function SignupSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-lg text-center">
        <div className="space-y-6 py-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-10 w-10"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-primary">Ton compte a été créé !</h1>
            <p className="text-sm text-muted-foreground">
              Vérifie ta boîte de réception (et tes spams) pour confirmer ton adresse email. Tu pourras ensuite te connecter.
            </p>
            <p className="text-xs text-muted-foreground">
              Tu n&apos;as pas reçu l&apos;email ? Vérifie tes spams ou essaie de te connecter pour renvoyer le lien.
            </p>
          </div>
          <Link
            href="/auth/signin"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 min-h-11 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}

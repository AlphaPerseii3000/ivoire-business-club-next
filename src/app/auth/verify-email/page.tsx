"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Jeton de vérification manquant dans le lien.");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMsg(data.error || "Une erreur est survenue lors de la vérification.");
        }
      } catch (err) {
        setStatus("error");
        setErrorMsg("Impossible de contacter le serveur. Veuillez vérifier votre connexion.");
      }
    };

    verifyToken();
  }, [token]);

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-lg text-center">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-primary">Vérification de l'adresse email</h1>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Vérification de votre compte en cours...
            </p>
          </div>
        ) : null}

        {isSuccess ? (
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
              <p className="text-base font-semibold text-emerald-500">Félicitations !</p>
              <p className="text-sm text-muted-foreground">
                Votre adresse email a été validée avec succès. Vous pouvez maintenant accéder à l'intégralité de votre espace membre.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 min-h-11 transition-colors"
            >
              Accéder au tableau de bord
            </Link>
          </div>
        ) : null}

        {isError ? (
          <div className="space-y-6 py-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-10 w-10"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-destructive">Échec de la vérification</p>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            </div>
            <div className="space-y-2">
              <Link
                href="/settings"
                className="inline-flex w-full items-center justify-center rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 min-h-11 transition-colors"
              >
                Retourner aux paramètres
              </Link>
              <Link
                href="/auth/signin"
                className="inline-flex w-full items-center justify-center rounded-md border py-2 text-sm font-medium hover:bg-muted min-h-11 transition-colors"
              >
                Se connecter
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-lg text-center">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}

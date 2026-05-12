"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signinSchema, type SigninInput } from "@/lib/validations";
import { getOAuthErrorMessage } from "@/lib/oauth-errors";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [serverError, setServerError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninInput>({
    resolver: zodResolver(signinSchema),
    mode: "onBlur",
  });

  const displayError = serverError || (urlError ? getOAuthErrorMessage(urlError) : "");

  const onSubmit = async (data: SigninInput) => {
    setServerError("");
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const payload = await res.json();
        setServerError(payload.error || "Email ou mot de passe incorrect.");
        return;
      }

      // Establish NextAuth session
      await signIn("credentials", {
        email: data.email,
        password: data.password,
        callbackUrl: "/dashboard",
      });
    } catch {
      setServerError("Erreur réseau");
    }
  };

  const handleGoogleSignIn = useCallback(() => {
    setGoogleLoading(true);
    setServerError("");
    signIn("google", { callbackUrl: "/dashboard" });
  }, [setGoogleLoading, setServerError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Connexion</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Accède à ton espace Ivoire Business Club
          </p>
        </div>
        {displayError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{displayError}</div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="ton@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Mot de passe</label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
        </div>
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || isSubmitting}
          className="w-full rounded-md border py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {googleLoading ? "Connexion en cours..." : "Continuer avec Google"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Pas encore membre ?{" "}
          <a href="/auth/signup" className="text-primary hover:underline">Créer un compte</a>
        </p>
      </div>
    </div>
  );
}

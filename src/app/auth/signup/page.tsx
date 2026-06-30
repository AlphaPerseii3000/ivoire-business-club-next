"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import posthog from "posthog-js";
import { signupSchema, type SignupInput } from "@/lib/validations";
import { getAuthErrorMessage } from "@/lib/auth-errors";

function getPasswordStrength(password: string): { label: string; color: string } {
  if (password.length === 0) return { label: "", color: "" };
  if (password.length < 8) return { label: "Faible", color: "text-red-500" };
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  if (password.length >= 12 && hasLetter && hasNumber && hasSymbol) {
    return { label: "Fort", color: "text-green-600" };
  }
  if (hasLetter && hasNumber) {
    return { label: "Moyen", color: "text-amber-500" };
  }
  return { label: "Faible", color: "text-red-500" };
}

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [serverError, setServerError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
  });

  const passwordValue = watch("password", "");
  const strength = getPasswordStrength(passwordValue);

  const displayError = serverError || (urlError ? getAuthErrorMessage(urlError) : "");

  const onSubmit = async (data: SignupInput) => {
    setServerError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const payload = await res.json();
        setServerError(payload.error || "Erreur lors de l'inscription");
        return;
      }

      // Auto sign in after signup
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.ok && !result?.error) {
        posthog.capture("user_signed_up", { method: "credentials" });
        window.location.href = "/dashboard?verify-email=1";
      } else {
        window.location.href = "/auth/signin?error=unverified";
      }
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
          <h1 className="text-2xl font-bold text-primary">Créer un compte</h1>
          <p className="mt-2 text-sm text-muted-foreground">Rejoins l&apos;Ivoire Business Club</p>
        </div>
        {displayError ? (
          <div data-testid="auth-error" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{displayError}</div>
        ) : null}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">Nom complet</label>
            <input
              id="name"
              data-testid="name-input"
              type="text"
              {...register("name")}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm min-h-11"
              placeholder="Jean Dupont"
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              id="email"
              data-testid="email-input"
              type="email"
              {...register("email")}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm min-h-11"
              placeholder="ton@email.com"
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Mot de passe</label>
            <input
              id="password"
              data-testid="password-input"
              type="password"
              {...register("password")}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm min-h-11"
              placeholder="••••••••"
            />
            {strength.label ? (
              <p className={`mt-1 text-xs font-medium ${strength.color}`}>
                Force : {strength.label}
              </p>
            ) : null}
            {errors.password ? (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>
          <button
            type="submit"
            data-testid="signup-button"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-11"
          >
            {isSubmitting ? "Création..." : "Créer mon compte"}
          </button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou</span>
          </div>
        </div>
        <button
          data-testid="google-oauth-button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full rounded-md border py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 min-h-11"
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordRequestSchema, type ForgotPasswordRequestInput } from "@/lib/validations";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordRequestInput>({
    resolver: zodResolver(forgotPasswordRequestSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ForgotPasswordRequestInput) => {
    setServerError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const payload = await res.json();
        setServerError(payload.error || "Une erreur est survenue.");
        return;
      }

      setSubmitted(true);
    } catch {
      setServerError("Erreur réseau");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Saisis ton email pour recevoir un lien de réinitialisation
          </p>
        </div>
        {serverError ? (
          <div data-testid="auth-error" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>
        ) : null}
        {submitted ? (
          <div data-testid="success-message" className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            Si un compte est associé à cet email, un lien de réinitialisation a été envoyé.
          </div>
        ) : null}
        {!submitted ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <button
              type="submit"
              data-testid="submit-button"
              disabled={isSubmitting}
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-11"
            >
              {isSubmitting ? "Envoi..." : "Envoyer le lien"}
            </button>
          </form>
        ) : null}
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/signin" className="text-primary hover:underline">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}

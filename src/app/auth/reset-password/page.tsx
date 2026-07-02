"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { passwordResetSchema, type PasswordResetInput } from "@/lib/validations";

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const type = searchParams.get("type") || "";
  const isSetPassword = type === "set";

  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    mode: "onBlur",
  });

  const passwordValue = watch("password", "");
  const strength = getPasswordStrength(passwordValue);
  const hasToken = Boolean(token);

  useEffect(() => {
    if (!token) {
      setServerError("Ce lien est invalide.");
    }
  }, [token]);

  const onSubmit = async (data: PasswordResetInput) => {
    setServerError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword,
          type,
        }),
      });

      const payload = await res.json().catch(() => ({ error: "Erreur réseau" }));

      if (!res.ok) {
        setServerError(
          typeof payload.error === "string"
            ? payload.error
            : "Une erreur est survenue."
        );
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(
          isSetPassword
            ? "/auth/signin?reset=set-success"
            : "/auth/signin?reset=success"
        );
      }, 2000);
    } catch {
      setServerError("Erreur réseau");
    }
  };

  const showForm = hasToken && !success;
  const showFallbackLink = !showForm && !success;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">
            {isSetPassword ? "Définir votre mot de passe" : "Nouveau mot de passe"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSetPassword
              ? "Choisissez un mot de passe sécurisé pour activer votre compte"
              : "Définis un nouveau mot de passe sécurisé"}
          </p>
        </div>
        {serverError ? (
          <div
            data-testid="auth-error"
            className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          >
            {serverError}
          </div>
        ) : null}
        {success ? (
          <div
            data-testid="success-message"
            className="rounded-md bg-green-50 p-3 text-sm text-green-700"
          >
            {isSetPassword
              ? "Votre mot de passe a été défini. Redirection..."
              : "Mot de passe mis à jour. Redirection vers la connexion..."}
          </div>
        ) : null}
        {showForm ? (
          <form
            data-testid="reset-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Nouveau mot de passe
              </label>
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
                <p className="mt-1 text-xs text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                data-testid="confirm-password-input"
                type="password"
                {...register("confirmPassword")}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm min-h-11"
                placeholder="••••••••"
              />
              {errors.confirmPassword ? (
                <p className="mt-1 text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </div>
            <button
              type="submit"
              data-testid="submit-button"
              disabled={isSubmitting}
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-11"
            >
              {isSubmitting
                ? isSetPassword
                  ? "Enregistrement..."
                  : "Mise à jour..."
                : isSetPassword
                ? "Définir le mot de passe"
                : "Réinitialiser le mot de passe"}
            </button>
          </form>
        ) : null}
        {showFallbackLink ? (
          <p className="text-center text-sm text-muted-foreground">
            {isSetPassword ? (
              <Link href="/auth/signin" className="text-primary hover:underline">
                Retour à la connexion
              </Link>
            ) : (
              <Link
                href="/auth/forgot-password"
                className="text-primary hover:underline"
              >
                Demander un nouveau lien
              </Link>
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}

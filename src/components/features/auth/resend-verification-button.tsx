"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export default function ResendVerificationButton() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function handleResend() {
    setStatus("idle");
    setMessage("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/send-verification", {
          method: "POST",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus("error");
          setMessage(data.error ?? "Une erreur est survenue lors de l'envoi.");
          return;
        }

        setStatus("success");
        setMessage("Email de vérification envoyé avec succès !");
      } catch (err) {
        setStatus("error");
        setMessage("Impossible de contacter le serveur. Veuillez vérifier votre connexion.");
      }
    });
  }

  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 px-4 py-2"
        disabled={isPending || isSuccess}
        onClick={handleResend}
      >
        {isPending ? "Envoi en cours..." : isSuccess ? "Email envoyé ✓" : "Renvoyer l'email de vérification"}
      </Button>
      {message ? (
        <p
          className={`text-xs ${isSuccess ? "text-emerald-600" : isError ? "text-destructive" : "text-muted-foreground"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

type RequestDocumentAccessButtonProps = {
  opportunityId: string;
  documentId: string;
  variant?: "locked" | "denied";
  onRequestSubmitted?: () => void;
};

export function RequestDocumentAccessButton({
  opportunityId,
  documentId,
  variant = "locked",
  onRequestSubmitted,
}: RequestDocumentAccessButtonProps) {
  const [loading, setLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"idle" | "pending">("idle");

  const label = variant === "denied" ? "Demander à nouveau" : "Demander l'accès";
  const ariaLabel = variant === "denied" ? `Redemander l'accès au document` : `Demander l'accès au document`;

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/opportunities/${opportunityId}/documents/${documentId}/request-access`,
        { method: "POST" },
      );
      const body = (await res.json()) as { data?: { id: string; status: string }; error?: string; code?: string };

      if (res.ok) {
        setRequestStatus("pending");
        toast.success("Demande d'accès envoyée. En attente de validation.");
        onRequestSubmitted?.();
      } else if (res.status === 409) {
        setRequestStatus("pending");
        toast.error(body.error ?? "Vous avez déjà demandé l'accès à ce document.");
      } else if (res.status === 403) {
        toast.error(body.error ?? "Accès non autorisé.");
      } else {
        toast.error(body.error ?? "Erreur lors de la demande d'accès.");
      }
    } catch {
      toast.error("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (requestStatus === "pending") {
    return (
      <span
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm font-medium text-yellow-700"
        role="status"
        aria-label="En attente de validation"
      >
        ⏳ En attente de validation
      </span>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={handleClick}
      disabled={loading}
      aria-label={ariaLabel}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Lock className="h-4 w-4" aria-hidden="true" />
      )}
      {label}
    </button>
  );
}
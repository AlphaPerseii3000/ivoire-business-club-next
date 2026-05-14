"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AdminSubscriptionActions({
  subscriptionId,
  status,
}: {
  subscriptionId: string;
  status: "PENDING" | "ACTIVE" | string;
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<"validate" | "reject" | "suspend" | null>(null);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [reason, setReason] = useState("");

  async function submitAction(action: "validate" | "reject" | "suspend", actionReason?: string) {
    setLoadingAction(action);
    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actionReason ? { action, reason: actionReason } : { action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Une erreur est survenue");
      }

      if (action === "validate") toast.success("Abonnement validé.");
      if (action === "reject") toast.success("Abonnement refusé.");
      if (action === "suspend") toast.success("Abonnement suspendu.");
      router.refresh();
      setShowRejectReason(false);
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setLoadingAction(null);
    }
  }

  if (status === "PENDING") {
    return (
      <div className="flex flex-col gap-3" aria-label="Actions abonnement en attente">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
            disabled={loadingAction !== null}
            onClick={() => submitAction("validate")}
          >
            {loadingAction === "validate" ? "Validation..." : "Valider"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
            disabled={loadingAction !== null}
            onClick={() => setShowRejectReason((value) => !value)}
          >
            Refuser
          </Button>
        </div>

        {showRejectReason ? (
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmedReason = reason.trim();
              if (!trimmedReason) {
                toast.error("La justification est obligatoire pour refuser un abonnement.");
                return;
              }
              void submitAction("reject", trimmedReason);
            }}
          >
            <label className="block text-sm font-medium" htmlFor={`reject-reason-${subscriptionId}`}>
              Justification du refus
            </label>
            <textarea
              id={`reject-reason-${subscriptionId}`}
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Expliquez clairement pourquoi le virement ne peut pas être validé."
            />
            <Button
              type="submit"
              variant="destructive"
              className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
              disabled={loadingAction !== null}
            >
              {loadingAction === "reject" ? "Refus en cours..." : "Confirmer le refus"}
            </Button>
          </form>
        ) : null}
      </div>
    );
  }

  if (status === "ACTIVE") {
    return (
      <div className="space-y-2" aria-label="Actions abonnement actif">
        <p className="text-xs text-muted-foreground">
          Cette action bloquera l’accès premium du membre immédiatement.
        </p>
        <Button
          type="button"
          variant="destructive"
          className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
          disabled={loadingAction !== null}
          onClick={() => submitAction("suspend")}
        >
          {loadingAction === "suspend" ? "Suspension..." : "Suspendre"}
        </Button>
      </div>
    );
  }

  return null;
}

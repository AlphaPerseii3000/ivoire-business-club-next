"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AccessRequest = {
  id: string;
  requester: { id: string; name: string; email: string };
  document: { id: string; originalName: string };
  createdAt: string;
};

type DocumentAccessRequestsProps = {
  opportunityId: string;
  requests: AccessRequest[];
};

type ProcessingState = {
  requestId: string;
  action: "approve" | "deny";
} | null;

export function DocumentAccessRequests({
  opportunityId,
  requests: initialRequests,
}: DocumentAccessRequestsProps) {
  const [requests, setRequests] = useState<AccessRequest[]>(initialRequests);
  const [processing, setProcessing] = useState<ProcessingState>(null);

  const handleAction = async (requestId: string, documentId: string, action: "approve" | "deny") => {
    setProcessing({ requestId, action });
    try {
      const res = await fetch(
        `/api/opportunities/${opportunityId}/documents/${documentId}/grant-access`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestIds: [requestId], action }),
        },
      );
      const body = (await res.json()) as { data?: { processed: number }; error?: string };

      if (res.ok) {
        const actionLabel = action === "approve" ? "approuvée" : "refusée";
        toast.success(`Demande ${actionLabel} avec succès.`);
        setRequests((current) => current.filter((r) => r.id !== requestId));
      } else {
        toast.error(body.error ?? "Erreur lors du traitement de la demande.");
      }
    } catch {
      toast.error("Erreur réseau. Veuillez réessayer.");
    } finally {
      setProcessing(null);
    }
  };

  if (requests.length === 0) {
    return null;
  }

  return (
    <section data-testid="document-access-requests" className="rounded-xl border bg-card p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        📋 Demandes d&apos;accès aux documents
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm text-primary">{requests.length}</span>
      </h2>
      <div className="mt-4 space-y-3">
        {requests.map((request) => {
          const isProcessing = processing?.requestId === request.id;
          const approveLabel = `Approuver la demande de ${request.requester.name}`;
          const denyLabel = `Refuser la demande de ${request.requester.name}`;

          return (
            <div key={request.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{request.requester.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Demande accès à : {request.document.originalName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => handleAction(request.id, request.document.id, "approve")}
                  disabled={isProcessing}
                  aria-label={approveLabel}
                >
                  {isProcessing && processing?.action === "approve" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                  Approuver
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => handleAction(request.id, request.document.id, "deny")}
                  disabled={isProcessing}
                  aria-label={denyLabel}
                >
                  {isProcessing && processing?.action === "deny" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <X className="h-4 w-4" aria-hidden="true" />
                  )}
                  Refuser
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
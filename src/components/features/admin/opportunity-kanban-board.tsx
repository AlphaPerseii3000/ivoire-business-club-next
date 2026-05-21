"use client";

import { FileText, Loader2, User } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { OpportunityDetailSheet, adminOpportunityAmount, adminOpportunityCardClass, adminOpportunityCategory, type AdminOpportunity } from "@/components/features/admin/opportunity-detail-sheet";
import { OPPORTUNITY_STATUS_LABELS, OpportunityStatusBadge } from "@/components/features/admin/opportunity-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VerificationStatusInput } from "@/lib/validations";

type AdminOpportunityKanbanProps = {
  opportunities: AdminOpportunity[];
};

type AdminAction = "verify" | "reject" | "start_review";

const STATUSES: VerificationStatusInput[] = ["PENDING", "EN_COURS", "VERIFIED", "REJECTED"];

const EMPTY_LABELS: Record<VerificationStatusInput, string> = {
  PENDING: "Aucun deal en attente",
  EN_COURS: "Aucun deal en cours",
  VERIFIED: "Aucun deal vérifié",
  REJECTED: "Aucun deal refusé",
};

async function patchOpportunity(id: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/admin/opportunities/${id}/verify`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof json.error === "string" ? json.error : "Action impossible pour le moment.";
    throw new Error(message);
  }
  return json.data as AdminOpportunity;
}

function getOptimisticStatus(opportunity: AdminOpportunity, action: AdminAction): VerificationStatusInput {
  if (action === "verify") {
    if (opportunity.requiresDoubleVerification) {
      return opportunity.approvalCount < 1 ? "EN_COURS" : "VERIFIED";
    }
    return "VERIFIED";
  }

  if (action === "reject") {
    return "REJECTED";
  }

  return "EN_COURS";
}

function getOptimisticApprovalCount(opportunity: AdminOpportunity, action: AdminAction) {
  if (action !== "verify") {
    return opportunity.approvalCount;
  }

  return opportunity.requiresDoubleVerification
    ? Math.min(opportunity.approvalCount + 1, 2)
    : opportunity.approvalCount;
}

function OpportunityCard({ opportunity, onOpen, onStartReview, disabled }: { opportunity: AdminOpportunity; onOpen: (opportunity: AdminOpportunity) => void; onStartReview: (opportunity: AdminOpportunity) => void; disabled: boolean }) {
  return (
    <Card size="sm" className={cn("transition-shadow hover:shadow-md", adminOpportunityCardClass(opportunity.verificationStatus))}>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <button type="button" className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onClick={() => onOpen(opportunity)}>
            <CardTitle className="line-clamp-2">{opportunity.title}</CardTitle>
          </button>
          <OpportunityStatusBadge status={opportunity.verificationStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-muted px-2 py-1">{adminOpportunityCategory(opportunity.category)}</span>
          <span className="rounded-md bg-primary/10 px-2 py-1 font-semibold text-primary">{adminOpportunityAmount(opportunity.amount)}</span>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            {opportunity.author.name}
          </p>
          <p>{new Date(opportunity.createdAt).toLocaleDateString("fr-FR")}</p>
          <p className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {opportunity.documentCount} document{opportunity.documentCount > 1 ? "s" : ""}
          </p>
          {opportunity.requiresDoubleVerification ? (
            <p className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">
              Double vérification requise ({opportunity.approvalCount}/2)
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => onOpen(opportunity)}>
            Détails
          </Button>
          {opportunity.verificationStatus === "PENDING" ? (
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onStartReview(opportunity)}>
              {disabled ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "En cours"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminOpportunityKanban({ opportunities }: AdminOpportunityKanbanProps) {
  const [items, setItems] = useState(opportunities);
  const [activeStatus, setActiveStatus] = useState<VerificationStatusInput>("PENDING");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selectedOpportunity = selectedId ? items.find((item) => item.id === selectedId) ?? null : null;

  const grouped = useMemo(() => {
    return STATUSES.reduce<Record<VerificationStatusInput, AdminOpportunity[]>>(
      (acc, status) => {
        acc[status] = items.filter((item) => item.verificationStatus === status);
        return acc;
      },
      { PENDING: [], EN_COURS: [], VERIFIED: [], REJECTED: [] },
    );
  }, [items]);

  async function runAction(opportunity: AdminOpportunity, action: AdminAction, note?: string) {
    setError(null);
    setMutatingId(opportunity.id);
    const previousItems = items;
    const optimisticStatus = getOptimisticStatus(opportunity, action);
    const optimisticApprovalCount = getOptimisticApprovalCount(opportunity, action);
    const optimisticCurrentAdminApproved = action === "verify" ? true : opportunity.currentAdminApproved;
    setItems((current) => current.map((item) => (item.id === opportunity.id ? { ...item, verificationStatus: optimisticStatus, approvalCount: optimisticApprovalCount, currentAdminApproved: optimisticCurrentAdminApproved } : item)));

    try {
      const updated = await patchOpportunity(opportunity.id, { action, note });
      setItems((current) => current.map((item) => (item.id === opportunity.id ? { ...item, ...updated, currentAdminApproved: action === "verify" ? true : item.currentAdminApproved } : item)));
      toast.success("Statut du deal mis à jour.");
      if (action === "verify" || action === "reject") {
        setSelectedId(null);
      }
      startTransition(() => router.refresh());
    } catch (actionError) {
      setItems(previousItems);
      const message = actionError instanceof Error ? actionError.message : "Action impossible pour le moment.";
      setError(message);
      toast.error(message);
    } finally {
      setMutatingId(null);
    }
  }

  const visibleMobileItems = grouped[activeStatus];

  return (
    <div className="mt-8">
      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Filtres de statut">
          {STATUSES.map((status) => (
            <Button
              key={status}
              type="button"
              variant={activeStatus === status ? "default" : "outline"}
              className="min-h-11 shrink-0"
              onClick={() => setActiveStatus(status)}
            >
              {OPPORTUNITY_STATUS_LABELS[status]} ({grouped[status].length})
            </Button>
          ))}
        </div>
        <div className="mt-4 space-y-4">
          {visibleMobileItems.length > 0 ? (
            visibleMobileItems.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                disabled={isPending || mutatingId === opportunity.id}
                onOpen={(item) => setSelectedId(item.id)}
                onStartReview={(item) => runAction(item, "start_review")}
              />
            ))
          ) : (
            <p className="rounded-xl border bg-muted/40 p-6 text-center text-sm text-muted-foreground">{EMPTY_LABELS[activeStatus]}</p>
          )}
        </div>
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-4">
        {STATUSES.map((status) => (
          <section key={status} className="min-h-[560px] rounded-2xl border bg-muted/30 p-3" aria-labelledby={`kanban-${status}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id={`kanban-${status}`} className="font-semibold">
                {OPPORTUNITY_STATUS_LABELS[status]}
              </h2>
              <span data-testid={`kanban-counter-${status}`} className="rounded-full bg-background px-2 py-1 text-xs text-muted-foreground">{grouped[status].length}</span>
            </div>
            <div data-testid={`kanban-scroll-${status}`} className="max-h-[calc(100vh-260px)] space-y-3 overflow-y-auto pr-1">
              {grouped[status].length > 0 ? (
                grouped[status].map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    disabled={isPending || mutatingId === opportunity.id}
                    onOpen={(item) => setSelectedId(item.id)}
                    onStartReview={(item) => runAction(item, "start_review")}
                  />
                ))
              ) : (
                <p className="rounded-xl border border-dashed bg-background/70 p-4 text-center text-sm text-muted-foreground">{EMPTY_LABELS[status]}</p>
              )}
            </div>
          </section>
        ))}
      </div>

      <OpportunityDetailSheet
        opportunity={selectedOpportunity}
        open={selectedOpportunity !== null}
        isMutating={mutatingId !== null}
        error={error}
        onOpenChange={(open) => setSelectedId(open ? selectedId : null)}
        onAction={async (id, action, note) => {
          const opportunity = items.find((item) => item.id === id);
          if (opportunity) {
            await runAction(opportunity, action, note);
          }
        }}
      />
    </div>
  );
}

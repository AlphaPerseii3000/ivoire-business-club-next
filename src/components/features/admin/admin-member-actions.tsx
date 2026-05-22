"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type MemberActionsProps = {
  userId: string;
  status: "ACTIVE" | "SUSPENDED";
  isCurrentAdmin: boolean;
  hasEmail: boolean;
};

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? "Une erreur est survenue.";
  } catch {
    return "Une erreur est survenue.";
  }
}

export function AdminMemberActions({ userId, status, isCurrentAdmin, hasEmail }: MemberActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isSuspended = status === "SUSPENDED";
  const statusAction = isSuspended ? "reactivate" : "suspend";
  const statusLabel = isSuspended ? "Réactiver" : "Suspendre";
  const successLabel = isSuspended ? "Compte réactivé." : "Compte suspendu.";
  const canSuspend = !isCurrentAdmin;
  const canEmail = hasEmail;
  const disableSuspend = isPending || !canSuspend;
  const disableEmail = isPending || !canEmail;

  function runStatusMutation() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: statusAction }),
      });
      if (!response.ok) {
        setMessage(await readApiError(response));
        return;
      }
      setMessage(successLabel);
      setDialogOpen(false);
      router.refresh();
    });
  }

  function sendConfirmationEmail() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/users/${userId}/confirmation-email`, { method: "POST" });
      if (!response.ok) {
        setMessage(await readApiError(response));
        return;
      }
      setMessage("Email de confirmation envoyé.");
    });
  }

  return (
    <div className="flex min-w-48 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {isSuspended ? (
          <Button type="button" className="min-h-11" disabled={isPending} onClick={runStatusMutation}>
            {statusLabel}
          </Button>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <Button type="button" variant="destructive" className="min-h-11" disabled={disableSuspend} />
              }
            >
              {statusLabel}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmer la suspension</DialogTitle>
                <DialogDescription>
                  Cette action bloque les prochaines connexions et requêtes protégées du membre.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="button" variant="destructive" className="min-h-11" disabled={isPending} onClick={runStatusMutation}>
                  Confirmer la suspension
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        <Button type="button" variant="outline" className="min-h-11" disabled={disableEmail} onClick={sendConfirmationEmail}>
          Envoyer email de confirmation
        </Button>
      </div>
      {isCurrentAdmin ? <p className="text-xs text-muted-foreground">Auto-suspension désactivée.</p> : null}
      {message ? <p className="text-xs text-muted-foreground" role="status">{message}</p> : null}
    </div>
  );
}

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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { VERIFICATION_LABELS } from "@/lib/verification";

type VerificationStatus = "PENDING" | "EN_COURS" | "VERIFIED" | "REJECTED";

type MemberActionsProps = {
  userId: string;
  status: "ACTIVE" | "SUSPENDED";
  verificationStatus: VerificationStatus;
  isCurrentAdmin: boolean;
  hasEmail: boolean;
  canVerifyMember: boolean;
  missingPrerequisites: string[];
};

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? "Une erreur est survenue.";
  } catch {
    return "Une erreur est survenue.";
  }
}

export function AdminMemberActions({
  userId,
  status,
  verificationStatus,
  isCurrentAdmin,
  hasEmail,
  canVerifyMember,
  missingPrerequisites,
}: MemberActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const isSuspended = status === "SUSPENDED";
  const statusAction = isSuspended ? "reactivate" : "suspend";
  const statusLabel = isSuspended ? "Réactiver" : "Suspendre";
  const successLabel = isSuspended ? "Compte réactivé." : "Compte suspendu.";
  const canSuspend = !isCurrentAdmin;
  const canEmail = hasEmail;
  const disableSuspend = isPending || !canSuspend;
  const disableEmail = isPending || !canEmail;
  const isPendingVerification = verificationStatus === "PENDING" || verificationStatus === "EN_COURS" || verificationStatus === "REJECTED";
  const canVerify = isPendingVerification && !isPending && canVerifyMember;

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

  function runVerifyMutation(action: "verify" | "reject") {
    startTransition(async () => {
      setMessage(null);
      const formData = new FormData();
      formData.set("action", action);
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        setMessage(await readApiError(response));
        return;
      }
      setMessage(action === "verify" ? "Membre vérifié ✓" : "Membre rejeté");
      setVerifyDialogOpen(false);
      setRejectDialogOpen(false);
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

        {isPendingVerification ? (
          <>
            {canVerifyMember ? (
              <>
                <Button type="button" variant="default" className="min-h-11" disabled={isPending} onClick={() => setVerifyDialogOpen(true)}>
                  Vérifier ✓
                </Button>
                <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmer la vérification</DialogTitle>
                      <DialogDescription>
                        Ce membre apparaîtra dans la section Membres du site et pourra accéder aux opportunités vérifiées.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setVerifyDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="button" className="min-h-11" disabled={isPending} onClick={() => runVerifyMutation("verify")}>
                        Confirmer la vérification
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="inline-block cursor-not-allowed">
                        <Button type="button" variant="default" className="min-h-11 pointer-events-none opacity-50" disabled>
                          Vérifier ✓
                        </Button>
                      </span>
                    }
                  />
                  <TooltipContent>
                    <p className="text-xs">
                      Critères manquants : {missingPrerequisites.map(code => VERIFICATION_LABELS[code] || code).join(", ")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <Button type="button" variant="outline" className="min-h-11" disabled={isPending} onClick={() => setRejectDialogOpen(true)}>
              Rejeter ✗
            </Button>
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer le rejet</DialogTitle>
                  <DialogDescription>
                    Ce membre ne pourra pas apparaître dans la section Membres. Il pourra être vérifié ultérieurement si nécessaire.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setRejectDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="button" variant="destructive" className="min-h-11" disabled={isPending} onClick={() => runVerifyMutation("reject")}>
                    Confirmer le rejet
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : verificationStatus === "VERIFIED" ? (
          <span className="inline-flex items-center text-sm text-emerald-700">✓ Vérifié</span>
        ) : null}

        <Button type="button" variant="outline" className="min-h-11" disabled={disableEmail} onClick={sendConfirmationEmail}>
          Envoyer email de confirmation
        </Button>
      </div>
      {isCurrentAdmin ? <p className="text-xs text-muted-foreground">Auto-suspension désactivée.</p> : null}
      {message ? <p className="text-xs text-muted-foreground" role="status">{message}</p> : null}
    </div>
  );
}
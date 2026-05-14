"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import SubscriptionStatusTracker from "@/components/subscription-status-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getTierConfig, type MembershipTier } from "@/lib/tier-config";

interface BankTransferInstructionsProps {
  tier: MembershipTier;
  beneficiary: string;
  iban: string;
  bic: string;
  bankAddress: string;
  currency: string;
  amount: number;
  reference: string;
}

type ConfirmationState =
  | { status: "idle"; message?: string }
  | { status: "submitting"; message?: string }
  | { status: "confirmed"; message?: string };

export function BankTransferInstructions({
  tier,
  beneficiary,
  iban,
  bic,
  bankAddress,
  currency,
  amount,
  reference,
}: BankTransferInstructionsProps) {
  const [confirmation, setConfirmation] = useState<ConfirmationState>({ status: "idle" });
  const config = getTierConfig(tier);
  const formattedAmount = `${amount} ${currency}`;
  const ribDisplay = iban || "IBAN/RIB en cours de configuration";

  const copyBlock = useMemo(() => {
    const lines = [
      `Bénéficiaire : ${beneficiary}`,
      `IBAN/RIB : ${ribDisplay}`,
      bic ? `BIC : ${bic}` : null,
      bankAddress ? `Adresse banque : ${bankAddress}` : null,
      `Montant : ${formattedAmount}`,
      `Devise : ${currency}`,
      `Référence : ${reference}`,
    ];

    return lines.filter((line): line is string => Boolean(line)).join("\n");
  }, [bankAddress, beneficiary, bic, currency, formattedAmount, reference, ribDisplay]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copié");
    } catch {
      toast.error("Impossible de copier. Sélectionne le texte manuellement.");
    }
  }

  async function confirmTransfer() {
    setConfirmation({ status: "submitting" });

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, period: "MONTHLY" }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : "Une erreur est survenue. Réessaie dans un instant.";
        setConfirmation({ status: "idle", message });
        toast.error(message);
        return;
      }

      setConfirmation({ status: "confirmed" });
      toast.success("Merci ! Nous validons sous 24h.");
    } catch {
      const message = "Connexion impossible. Vérifie ta connexion puis réessaie.";
      setConfirmation({ status: "idle", message });
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={config.badgeClassName}>{config.label}</Badge>
            <Badge variant="outline">Virement bancaire</Badge>
          </div>
          <CardTitle className="text-2xl font-bold">Instructions de virement</CardTitle>
          <p className="text-sm text-muted-foreground">
            Effectue le virement depuis ta banque, puis confirme l&apos;envoi pour entrer dans la validation manuelle IBC.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bénéficiaire</p>
              <p className="mt-1 text-lg font-semibold">{beneficiary}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Montant</p>
              <p className="mt-1 text-lg font-semibold">{formattedAmount}</p>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">IBAN/RIB</p>
                <p className="mt-1 break-all font-mono text-sm sm:text-base">{ribDisplay}</p>
              </div>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => copyText(ribDisplay)}>
                <Copy className="mr-2 size-4" aria-hidden="true" />
                Copier
              </Button>
            </div>
            {bic ? (
              <p className="mt-3 text-sm text-muted-foreground">BIC : {bic}</p>
            ) : null}
            {bankAddress ? (
              <p className="mt-1 text-sm text-muted-foreground">Adresse banque : {bankAddress}</p>
            ) : null}
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Référence à indiquer</p>
            <p className="mt-1 break-all font-mono text-base font-semibold">{reference}</p>
          </div>

          <Button type="button" variant="secondary" className="min-h-11 w-full" onClick={() => copyText(copyBlock)}>
            <Copy className="mr-2 size-4" aria-hidden="true" />
            Copier tout
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions fréquentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Combien de temps pour la validation ?</h2>
            <p className="text-sm text-muted-foreground">Sous 24h ouvrées</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-4">
          {confirmation.status === "confirmed" ? (
            <div className="space-y-4" data-testid="transfer-confirmation">
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                <CheckCircle2 className="size-5" aria-hidden="true" />
                <p className="font-medium">Merci ! Nous validons sous 24h.</p>
              </div>
              <SubscriptionStatusTracker status="PENDING" />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Clique uniquement après avoir lancé le virement depuis ta banque avec la référence indiquée.
              </p>
              {confirmation.message ? (
                <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {confirmation.message}
                </p>
              ) : null}
              <Button
                type="button"
                className="min-h-11 w-full"
                disabled={confirmation.status === "submitting"}
                onClick={confirmTransfer}
              >
                {confirmation.status === "submitting" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                ) : null}
                J&apos;ai effectué le virement
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />
    </div>
  );
}

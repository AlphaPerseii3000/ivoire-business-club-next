"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Copy, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { formatMobileMoneyAmount, formatMobileMoneyReference, getMobileMoneyConfig, getProviderColorClasses } from "@/lib/mobile-money-config";
import { getTierConfig, type MembershipTier } from "@/lib/tier-config";

interface OrangeMoneyInstructionsProps {
  tier: MembershipTier;
  userId: string;
  amount: number;
}

export function OrangeMoneyInstructions({ tier, userId, amount }: OrangeMoneyInstructionsProps) {
  const config = getTierConfig(tier);
  const orangeConfig = getMobileMoneyConfig("ORANGE_MONEY");
  const colors = getProviderColorClasses("ORANGE_MONEY");
  const reference = useMemo(() => formatMobileMoneyReference(userId, tier), [userId, tier]);

  async function copyText(text: string) {
    if (typeof window === "undefined" || !navigator?.clipboard) {
      toast.error("Le presse-papiers n'est pas disponible sur ce navigateur.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copié");
    } catch {
      toast.error("Impossible de copier. Sélectionne le texte manuellement.");
    }
  }

  return (
    <div data-testid="orange-money-instructions" className="space-y-5">
      <Card className={`border shadow-sm ${colors.border}`}>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={config.badgeClassName}>{config.label}</Badge>
            <Badge className={colors.badge}>
              <Smartphone className="mr-1 size-3" aria-hidden="true" />
              Orange Money
            </Badge>
          </div>
          <CardTitle className="text-2xl font-bold">Instructions de paiement Orange Money</CardTitle>
          <p className="text-sm text-muted-foreground">
            Effectue ton paiement depuis l&apos;application Orange Money ou le code USSD. Nous validons sous 24h.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code USSD / Numéro marchand</p>
              <p data-testid="orange-money-ussd" className="mt-1 text-lg font-semibold">{orangeConfig.ussdCode}</p>
              <p data-testid="orange-money-merchant-number" className="mt-1 text-sm text-muted-foreground">{orangeConfig.merchantNumber}</p>
              <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => copyText(orangeConfig.ussdCode)}>
                <Copy className="mr-1 size-3.5" /> Copier le code
              </Button>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Montant à transférer</p>
              <p data-testid="orange-money-amount" className="mt-1 text-lg font-semibold text-primary">{formatMobileMoneyAmount(amount)}</p>
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${colors.bg}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">Référence à indiquer obligatoirement</p>
                <p data-testid="orange-money-reference" className="mt-1 break-all font-mono text-base font-bold">{reference}</p>
              </div>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => copyText(reference)}>
                <Copy className="mr-2 size-4" /> Copier la référence
              </Button>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm font-semibold">Étapes à suivre</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {orangeConfig.instructionLines.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-950 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            <p className="font-medium">Abonnement créé en statut Essai. Nous validons sous 24h après réception du paiement.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OrangeMoneyInstructions;

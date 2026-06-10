"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Loader2, Landmark, Globe } from "lucide-react";
import { toast } from "sonner";

import SubscriptionStatusTracker from "@/components/subscription-status-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getTierConfig, type MembershipTier } from "@/lib/tier-config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type BankAccountXOF, type BankAccountEUR, XOF_ROUNDED_AMOUNTS, formatNumber } from "@/lib/bank-transfer-config";

interface BankTransferInstructionsProps {
  tier: MembershipTier;
  beneficiary: string;
  iban: string;
  bic: string;
  bankAddress: string;
  currency: string;
  amount: number;
  reference: string;
  xofDetails?: BankAccountXOF;
  eurDetails?: BankAccountEUR;
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
  xofDetails,
  eurDetails,
}: BankTransferInstructionsProps) {
  const [confirmation, setConfirmation] = useState<ConfirmationState>({ status: "idle" });
  const [activeTab, setActiveTab] = useState<string>(currency.toLowerCase() === "xof" ? "xof" : "eur");
  const config = getTierConfig(tier);

  const xofAmounts = useMemo(() => {
    // Parité fixe officielle : 1 EUR = 655.957 XOF
    const exact = Math.round(amount * 655.957);
    const rounded = XOF_ROUNDED_AMOUNTS[amount] || exact;

    return { exact, rounded };
  }, [amount]);

  const resolvedXof = useMemo<BankAccountXOF>(() => {
    return xofDetails || {
      bankName: "VERSUS BANK",
      domiciliation: "01005-AGENCE ANGRE",
      iban: currency === "XOF" ? iban : "CI93 CI11 2010 0501 8780 4900 0125",
      beneficiary: beneficiary,
      currency: "XOF",
      bic: currency === "XOF" ? bic : "VSBKCIABXXX",
      bankCode: "CI112",
      branchCode: "01005",
      accountNumber: "018780490001",
      ribKey: "25",
      bankAddress: "01 BP 1874 ABIDJAN 01, COTE D'IVOIRE",
    };
  }, [xofDetails, currency, iban, beneficiary, bic]);

  const resolvedEur = useMemo<BankAccountEUR>(() => {
    return eurDetails || {
      bankName: "SOCIETE GENERALE - PARIS",
      bankAddress: currency === "EUR" ? bankAddress : "17 Cours Valmy Tour Granite 92800 Paris La Défense 7 France",
      bic: currency === "EUR" ? bic : "SOGEFRPPXXX",
      iban: currency === "EUR" ? iban : "FR76 3000 3069 9000 1016 1063 363",
      faveur: "VERSUS BANK",
      bankCode: "30003",
      branchCode: "06990",
      accountNumber: "00101610633",
      ribKey: "63",
      swift: "VSBKCIABXXX",
      finalBeneficiary: beneficiary,
      finalBankCode: "CI112",
      finalBranchCode: "01005",
      finalAccountNumber: "018780490001",
      finalRibKey: "25",
      finalIban: currency === "XOF" ? iban : "CI93 CI11 2010 0501 8780 4900 0125",
      currency: "EUR",
    };
  }, [eurDetails, currency, bankAddress, bic, beneficiary, iban]);

  const copyBlockEur = useMemo(() => {
    return [
      `Banque Domiciliation : ${resolvedEur.bankName}`,
      `Adresse Banque : ${resolvedEur.bankAddress}`,
      `BIC / SWIFT : ${resolvedEur.bic}`,
      `Faveur : ${resolvedEur.faveur} (SWIFT: ${resolvedEur.swift})`,
      `Coordonnées Compte Transit (SocGen) :`,
      `- IBAN de transit : ${resolvedEur.iban}`,
      `- Code Banque : ${resolvedEur.bankCode}`,
      `- Code Guichet : ${resolvedEur.branchCode}`,
      `- N° Compte : ${resolvedEur.accountNumber}`,
      `- Clé RIB : ${resolvedEur.ribKey}`,
      `Bénéficiaire Final : ${resolvedEur.finalBeneficiary}`,
      `Coordonnées Compte Final (Versus Bank) :`,
      `- Code Banque : ${resolvedEur.finalBankCode}`,
      `- Code Guichet : ${resolvedEur.finalBranchCode}`,
      `- N° Compte : ${resolvedEur.finalAccountNumber}`,
      `- Clé RIB : ${resolvedEur.finalRibKey}`,
      `- IBAN Final : ${resolvedEur.finalIban}`,
      `Montant : ${amount} EUR`,
      `Référence : ${reference}`,
    ].join("\n");
  }, [resolvedEur, amount, reference]);

  const copyBlockXof = useMemo(() => {
    return [
      `Bénéficiaire : ${resolvedXof.beneficiary}`,
      `Banque : ${resolvedXof.bankName} (${resolvedXof.domiciliation})`,
      `Adresse Banque : ${resolvedXof.bankAddress}`,
      `BIC / SWIFT : ${resolvedXof.bic}`,
      `Coordonnées Compte :`,
      `- Code Banque : ${resolvedXof.bankCode}`,
      `- Code Guichet : ${resolvedXof.branchCode}`,
      `- N° Compte : ${resolvedXof.accountNumber}`,
      `- Clé RIB : ${resolvedXof.ribKey}`,
      `- IBAN / RIB : ${resolvedXof.iban}`,
      `Montant Exact : ${formatNumber(xofAmounts.exact)} XOF`,
      `Montant Suggéré : ${formatNumber(xofAmounts.rounded)} XOF`,
      `Référence : ${reference}`,
    ].join("\n");
  }, [resolvedXof, xofAmounts, reference]);

  const activeCopyBlock = activeTab === "eur" ? copyBlockEur : copyBlockXof;

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
            Sélectionne ta devise, effectue le virement depuis ta banque, puis confirme l&apos;envoi pour entrer dans la validation manuelle IBC.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted rounded-xl">
              <TabsTrigger value="eur" className="py-2.5 flex items-center justify-center gap-2">
                <Globe className="size-4" />
                Virement en EUR (SEPA / International)
              </TabsTrigger>
              <TabsTrigger value="xof" className="py-2.5 flex items-center justify-center gap-2">
                <Landmark className="size-4" />
                Virement en XOF (UEMOA / Local CI)
              </TabsTrigger>
            </TabsList>

            {/* ONGLET EUR */}
            <TabsContent value="eur" className="space-y-5 pt-4 outline-none">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bénéficiaire Final</p>
                  <p className="mt-1 text-lg font-semibold">{resolvedEur.finalBeneficiary}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Montant à transférer</p>
                  <p className="mt-1 text-lg font-semibold text-primary">{amount} EUR</p>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-4">
                <div className="border-b pb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">1. Banque Intermédiaire (Correspondante)</p>
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <p className="font-semibold text-muted-foreground">Banque Domiciliation</p>
                      <p className="font-medium">{resolvedEur.bankName}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Adresse Banque</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{resolvedEur.bankAddress}</p>
                    </div>
                    <div className="flex items-center justify-between sm:col-span-2 mt-2 bg-muted/40 p-2 rounded-lg">
                      <div>
                        <p className="font-semibold text-muted-foreground text-xs">BIC (Société Générale)</p>
                        <p className="font-mono text-sm font-semibold">{resolvedEur.bic}</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => copyText(resolvedEur.bic)}>
                        <Copy className="size-3.5 mr-1" /> Copier
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">2. Compte de transit chez SocGen</p>
                  <div className="mt-2 text-sm space-y-2">
                    <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg">
                      <div>
                        <p className="font-semibold text-muted-foreground text-xs">Faveur (Titulaire)</p>
                        <p className="font-medium text-sm">{resolvedEur.faveur}</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => copyText(resolvedEur.faveur)}>
                        <Copy className="size-3.5 mr-1" /> Copier
                      </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-muted/50 p-2.5 rounded-lg gap-2 mt-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-muted-foreground text-xs">IBAN de transit (RIB)</p>
                        <p className="font-mono text-sm font-semibold break-all">{resolvedEur.iban}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => copyText(resolvedEur.iban)}>
                        <Copy className="size-3.5 mr-1" /> Copier IBAN Transit
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                      <div className="bg-muted/30 p-2 rounded">
                        <p className="text-muted-foreground">Code Banque</p>
                        <p className="font-mono font-bold mt-0.5">{resolvedEur.bankCode}</p>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <p className="text-muted-foreground">Code Guichet</p>
                        <p className="font-mono font-bold mt-0.5">{resolvedEur.branchCode}</p>
                      </div>
                      <div className="bg-muted/30 p-2 rounded col-span-2 flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground">N° Compte</p>
                          <p className="font-mono font-bold mt-0.5">{resolvedEur.accountNumber}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="size-6" onClick={() => copyText(resolvedEur.accountNumber)}>
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">3. Compte Final de Destination (Versus Bank)</p>
                  <div className="mt-2 text-sm space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-muted/50 p-2.5 rounded-lg gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-muted-foreground text-xs">IBAN Final (RIB)</p>
                        <p className="font-mono text-sm font-semibold break-all">{resolvedEur.finalIban}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => copyText(resolvedEur.finalIban)}>
                        <Copy className="size-3.5 mr-1" /> Copier IBAN Final
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                      <div className="bg-muted/30 p-2 rounded">
                        <p className="text-muted-foreground">Code Banque</p>
                        <p className="font-mono font-medium mt-0.5">{resolvedEur.finalBankCode}</p>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <p className="text-muted-foreground">Code Guichet</p>
                        <p className="font-mono font-medium mt-0.5">{resolvedEur.finalBranchCode}</p>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <p className="text-muted-foreground">N° Compte</p>
                        <p className="font-mono font-medium mt-0.5">{resolvedEur.finalAccountNumber}</p>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <p className="text-muted-foreground">Clé RIB</p>
                        <p className="font-mono font-medium mt-0.5">{resolvedEur.finalRibKey}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-amber-50/50 border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Référence à indiquer obligatoirement</p>
                    <p className="mt-1 break-all font-mono text-base font-bold text-amber-900 dark:text-amber-100">{reference}</p>
                  </div>
                  <Button type="button" variant="outline" className="min-h-11 border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/30" onClick={() => copyText(reference)}>
                    <Copy className="mr-2 size-4" />
                    Copier
                  </Button>
                </div>
              </div>

              <Button type="button" variant="secondary" className="min-h-11 w-full" onClick={() => copyText(activeCopyBlock)}>
                <Copy className="mr-2 size-4" aria-hidden="true" />
                Copier toutes les informations EUR
              </Button>
            </TabsContent>

            {/* ONGLET XOF */}
            <TabsContent value="xof" className="space-y-5 pt-4 outline-none">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bénéficiaire</p>
                  <p className="mt-1 text-lg font-semibold">{resolvedXof.beneficiary}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Montant à transférer</p>
                  <p className="mt-1 text-lg font-semibold text-primary">
                    {formatNumber(xofAmounts.rounded)} XOF <span className="text-xs font-normal text-muted-foreground">(suggéré)</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Montant exact converti (1€ = 655,957 XOF) : {formatNumber(xofAmounts.exact)} XOF</p>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Coordonnées Bancaires (Versus Bank Côte d&apos;Ivoire)</p>
                  <div className="mt-3 text-sm space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="font-semibold text-muted-foreground">Banque de Domiciliation</p>
                        <p className="font-medium">{resolvedXof.bankName} ({resolvedXof.domiciliation})</p>
                      </div>
                      <div>
                        <p className="font-semibold text-muted-foreground">Adresse Banque</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{resolvedXof.bankAddress}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-muted/50 p-2.5 rounded-lg gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-muted-foreground text-xs">IBAN / RIB de destination</p>
                        <p className="font-mono text-sm font-semibold break-all">{resolvedXof.iban}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => copyText(resolvedXof.iban)}>
                        <Copy className="size-3.5 mr-1" /> Copier IBAN
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
                      <div className="bg-muted/30 p-2 rounded">
                        <p className="text-muted-foreground">Code Banque</p>
                        <p className="font-mono font-medium mt-0.5">{resolvedXof.bankCode}</p>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <p className="text-muted-foreground">Code Guichet</p>
                        <p className="font-mono font-medium mt-0.5">{resolvedXof.branchCode}</p>
                      </div>
                      <div className="bg-muted/30 p-2 rounded sm:col-span-2">
                        <p className="text-muted-foreground">N° Compte</p>
                        <p className="font-mono font-medium mt-0.5">{resolvedXof.accountNumber}</p>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <p className="text-muted-foreground">Clé RIB</p>
                        <p className="font-mono font-medium mt-0.5">{resolvedXof.ribKey}</p>
                      </div>
                    </div>

                    {resolvedXof.bic && (
                      <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg">
                        <div>
                          <p className="font-semibold text-muted-foreground text-xs">Code BIC / SWIFT</p>
                          <p className="font-mono text-sm font-semibold">{resolvedXof.bic}</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => copyText(resolvedXof.bic)}>
                          <Copy className="size-3.5 mr-1" /> Copier
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-amber-50/50 border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Référence à indiquer obligatoirement</p>
                    <p className="mt-1 break-all font-mono text-base font-bold text-amber-900 dark:text-amber-100">{reference}</p>
                  </div>
                  <Button type="button" variant="outline" className="min-h-11 border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/30" onClick={() => copyText(reference)}>
                    <Copy className="mr-2 size-4" />
                    Copier
                  </Button>
                </div>
              </div>

              <Button type="button" variant="secondary" className="min-h-11 w-full" onClick={() => copyText(activeCopyBlock)}>
                <Copy className="mr-2 size-4" aria-hidden="true" />
                Copier toutes les informations XOF
              </Button>
            </TabsContent>
          </Tabs>
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


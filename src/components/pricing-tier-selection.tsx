"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import posthog from "posthog-js";

import { OrangeMoneyInstructions } from "@/components/orange-money-instructions";
import { PaymentMethodSelector, type PaymentProvider } from "@/components/payment-method-selector";
import { TierCard } from "@/components/tier-card";
import { WaveInstructions } from "@/components/wave-instructions";
import { getAmountForTier } from "@/lib/bank-transfer-config";
import { MEMBERSHIP_TIERS, type MembershipTier } from "@/lib/tier-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PricingTierSelectionProps {
  isAuthenticated: boolean;
  userId?: string;
}

type Step = "select" | "instructions";
type MobileProvider = "WAVE" | "ORANGE_MONEY";

export function PricingTierSelection({ isAuthenticated, userId }: PricingTierSelectionProps) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [mobileProvider, setMobileProvider] = useState<MobileProvider | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"MONTHLY" | "SEMESTERIAL" | "ANNUAL">("MONTHLY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasSelectedAuthenticatedTier = isAuthenticated ? selectedTier !== null : false;
  const shouldShowPaymentSelector = hasSelectedAuthenticatedTier && step === "select";
  const shouldShowMobileInstructions = step === "instructions" && mobileProvider !== null && selectedTier !== null;
  const shouldShowMobileInstructionsWithUser = shouldShowMobileInstructions && selectedTier !== null && userId !== undefined;

  function handleTierSelect(tier: MembershipTier) {
    posthog.capture("tier_selected", { tier, source: "pricing_page" });
    setSelectedTier(tier);
    setStep("select");
    setMobileProvider(null);
    setSelectedPeriod("MONTHLY");
    setSubmitError(null);
  }

  async function handlePaymentSubmit(provider: PaymentProvider, phone?: string) {
    setSubmitError(null);

    if (!selectedTier) return;

    if (provider === "BANK_TRANSFER") {
      router.push(`/pricing/virement?tier=${selectedTier}&period=${selectedPeriod}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedTier,
          period: selectedPeriod,
          provider,
          providerPhone: phone,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : "Une erreur est survenue. Réessaie dans un instant.";
        setSubmitError(message);
        toast.error(message);
        setIsSubmitting(false);
        return;
      }

      setMobileProvider(provider);
      setStep("instructions");
      toast.success("Abonnement créé. Effectue ton paiement pour finaliser.");
    } catch {
      const message = "Connexion impossible. Vérifie ta connexion puis réessaie.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancelPayment() {
    setSelectedTier(null);
    setStep("select");
    setMobileProvider(null);
    setSubmitError(null);
  }

  return (
    <div className="space-y-8" data-testid="pricing-tier-selection">
      <div data-testid="pricing-tier-grid" className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
        {MEMBERSHIP_TIERS.map((tier) => (
          <TierCard
            key={tier.tier}
            tier={tier.tier}
            href={isAuthenticated ? undefined : "/auth/signup"}
            actionLabel={isAuthenticated ? "Sélectionner" : tier.ctaLabel}
            isSelected={isAuthenticated ? selectedTier === tier.tier : false}
            onSelect={isAuthenticated ? handleTierSelect : undefined}
          />
        ))}
      </div>

      {!isAuthenticated ? (
        <p className="text-center text-sm text-muted-foreground">
          Déjà membre ?{" "}
          <Link href="/auth/signin" className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Connecte-toi
          </Link>{" "}
          pour sélectionner une offre et recevoir les instructions de virement.
        </p>
      ) : null}

      {shouldShowPaymentSelector ? (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Offre sélectionnée. Choisis la durée de ton abonnement.
              </p>
              {selectedTier ? (
                <p className="text-sm font-semibold text-primary" data-testid="selected-amount">
                  {getAmountForTier(selectedTier, selectedPeriod)} €
                </p>
              ) : null}
            </div>
            <div
              data-testid="period-selector"
              className="inline-flex flex-wrap gap-2 rounded-xl border bg-muted p-1"
              role="group"
              aria-label="Durée de l'abonnement"
            >
              {[
                { value: "MONTHLY", label: "Mensuel" },
                { value: "SEMESTERIAL", label: "Semestriel" },
                { value: "ANNUAL", label: "Annuel" },
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPeriod(option.value as "MONTHLY" | "SEMESTERIAL" | "ANNUAL")}
                  className={cn(
                    "rounded-lg text-sm font-medium transition-all",
                    selectedPeriod === option.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={selectedPeriod === option.value}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Choisis comment tu souhaites régler ton abonnement.
          </p>
          <PaymentMethodSelector
            defaultProvider="BANK_TRANSFER"
            onSubmit={handlePaymentSubmit}
            onCancel={handleCancelPayment}
            isLoading={isSubmitting}
            error={submitError}
          />
        </div>
      ) : null}

      {shouldShowMobileInstructionsWithUser ? (
        <div className="space-y-4">
          <button
            type="button"
            data-testid="payment-back-button"
            onClick={() => {
              setStep("select");
              setMobileProvider(null);
              setSubmitError(null);
            }}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Changer de moyen de paiement
          </button>
          {mobileProvider === "WAVE" ? (
            <WaveInstructions tier={selectedTier!} userId={userId} amount={getAmountForTier(selectedTier!, selectedPeriod)} />
          ) : (
            <OrangeMoneyInstructions tier={selectedTier!} userId={userId} amount={getAmountForTier(selectedTier!, selectedPeriod)} />
          )}
        </div>
      ) : null}
    </div>
  );
}

export default PricingTierSelection;

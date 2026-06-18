"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { OrangeMoneyInstructions } from "@/components/orange-money-instructions";
import { PaymentMethodSelector, type PaymentProvider } from "@/components/payment-method-selector";
import { TierCard } from "@/components/tier-card";
import { WaveInstructions } from "@/components/wave-instructions";
import { getAmountForTier } from "@/lib/bank-transfer-config";
import { MEMBERSHIP_TIERS, type MembershipTier } from "@/lib/tier-config";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasSelectedAuthenticatedTier = isAuthenticated ? selectedTier !== null : false;
  const isMobileMoneyStep = step === "instructions" && mobileProvider !== null && selectedTier !== null;

  function handleTierSelect(tier: MembershipTier) {
    setSelectedTier(tier);
    setStep("select");
    setMobileProvider(null);
    setSubmitError(null);
  }

  async function handlePaymentSubmit(provider: PaymentProvider, phone?: string) {
    setSubmitError(null);

    if (!selectedTier) return;

    if (provider === "BANK_TRANSFER") {
      router.push(`/pricing/virement?tier=${selectedTier}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedTier,
          period: "MONTHLY",
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

      {hasSelectedAuthenticatedTier && step === "select" ? (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm text-muted-foreground">
            Offre sélectionnée. Choisis comment tu souhaites régler ton abonnement.
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

      {isMobileMoneyStep && selectedTier && userId ? (
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
            <WaveInstructions tier={selectedTier} userId={userId} amount={getAmountForTier(selectedTier)} />
          ) : (
            <OrangeMoneyInstructions tier={selectedTier} userId={userId} amount={getAmountForTier(selectedTier)} />
          )}
        </div>
      ) : null}
    </div>
  );
}

export default PricingTierSelection;

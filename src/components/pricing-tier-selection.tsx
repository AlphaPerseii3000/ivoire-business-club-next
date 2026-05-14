"use client";

import Link from "next/link";
import { useState } from "react";

import { TierCard } from "@/components/tier-card";
import { buttonVariants } from "@/components/ui/button";
import { MEMBERSHIP_TIERS, type MembershipTier } from "@/lib/tier-config";

interface PricingTierSelectionProps {
  isAuthenticated: boolean;
}

export function PricingTierSelection({ isAuthenticated }: PricingTierSelectionProps) {
  const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null);

  return (
    <div className="space-y-8">
      <div data-testid="pricing-tier-grid" className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
        {MEMBERSHIP_TIERS.map((tier) => (
          <TierCard
            key={tier.tier}
            tier={tier.tier}
            href={isAuthenticated ? undefined : "/auth/signup"}
            actionLabel={isAuthenticated ? "Sélectionner" : tier.ctaLabel}
            isSelected={isAuthenticated ? selectedTier === tier.tier : false}
            onSelect={isAuthenticated ? setSelectedTier : undefined}
          />
        ))}
      </div>

      {isAuthenticated && selectedTier ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            Offre sélectionnée. Continue pour recevoir les instructions de virement KS Investment.
          </p>
          <Link
            href={`/pricing/virement?tier=${selectedTier}`}
            className={buttonVariants({
              className: "min-h-11 px-6 focus-visible:ring-3 focus-visible:ring-ring/50",
            })}
          >
            Continuer
          </Link>
        </div>
      ) : null}

      {!isAuthenticated ? (
        <p className="text-center text-sm text-muted-foreground">
          Déjà membre ?{" "}
          <Link href="/auth/signin" className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Connecte-toi
          </Link>{" "}
          pour sélectionner une offre et recevoir les instructions de virement.
        </p>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { BankTransferInstructions } from "@/components/bank-transfer-instructions";
import { buttonVariants } from "@/components/ui/button";
import { getBankTransferDetails } from "@/lib/bank-transfer-config";
import { auth } from "@/lib/auth";
import { getAmountForTier } from "@/lib/bank-transfer-config";
import { getTierConfig, type MembershipTier } from "@/lib/tier-config";
import LandingMobileNav from "@/components/landing/mobile-nav";

const allowedTiers: MembershipTier[] = ["AFFRANCHI", "GRAND_FRERE", "BOSS"];

type VirementPageProps = {
  searchParams: Promise<{ tier?: string | string[] }>;
};

function normalizeTier(value: string | string[] | undefined): MembershipTier | null {
  const tier = Array.isArray(value) ? value[0] : value;
  return allowedTiers.includes(tier as MembershipTier) ? (tier as MembershipTier) : null;
}

export default async function BankTransferPage({ searchParams }: VirementPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const params = await searchParams;
  const tier = normalizeTier(params.tier);

  if (!tier) {
    redirect("/pricing");
  }

  const details = getBankTransferDetails();
  const amount = getAmountForTier(tier);
  const reference = `IBC-${session.user.id}-${tier}`;
  const tierConfig = getTierConfig(tier);

  return (
    <div className="min-h-screen">
      <LandingMobileNav />
      <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 space-y-4">
        <Link href="/pricing" className={buttonVariants({ variant: "ghost", className: "min-h-11 px-0" })}>
          ← Retour aux offres
        </Link>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Paiement par virement bancaire</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Finalise ton abonnement {tierConfig.label}</h1>
          <p className="max-w-2xl text-muted-foreground">
            Utilise ces informations pour ton virement à KS Investment. La référence doit être recopiée exactement pour accélérer la validation.
          </p>
        </div>
      </div>

      <BankTransferInstructions
        tier={tier}
        beneficiary={details.beneficiary}
        iban={details.iban}
        bic={details.bic}
        bankAddress={details.bankAddress}
        currency={details.currency}
        amount={amount}
        reference={reference}
        xofDetails={details.xof}
        eurDetails={details.eur}
      />
      </main>
    </div>
  );
}

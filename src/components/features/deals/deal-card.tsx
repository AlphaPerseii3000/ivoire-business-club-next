import Link from "next/link";
import { MapPin, Paperclip, LockKeyhole } from "lucide-react";

import { TrustBadge } from "@/components/features/deals/trust-badge";
import { TagChips } from "@/components/features/tags/tag-chips";
import { WhatsAppCTA } from "@/components/features/deals/whatsapp-cta";
import { InterestButton } from "@/components/features/deals/interest-button";
import type { OpportunityMatchMetadata } from "@/lib/matching";
import type { SelectedTag } from "@/lib/tags";
import { getSafeTrustLevel, type TrustLevel } from "@/lib/trust-level";

type DealCardDeal = {
  id: string;
  title: string;
  amount?: number | null;
  location?: string | null;
  verificationStatus?: string;
  documentCount?: number;
  trustLevel?: TrustLevel | null;
  requiresDoubleVerification?: boolean;
  approvalCount?: number;
  authorStats?: {
    validatedDealsCount?: number | null;
    averageRating?: number | null;
  } | null;
  tags?: SelectedTag[];
  author?: { phone?: string | null };
  category?: string | null;
};

type DealCardProps = {
  deal: DealCardDeal;
  match?: OpportunityMatchMetadata;
  isTeaser?: boolean;
};

export function DealCard({ deal, match, isTeaser = false }: DealCardProps) {
  const location = deal.location?.trim() ? deal.location : "Localisation non renseignée";

  if (isTeaser) {
    const categoryLabel = deal.category ? deal.category : "Opportunité Privée";
    return (
      <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0F172A] min-h-[300px] p-6 shadow-xl transition-all duration-300 hover:border-[#D4A847]/30">
        {/* Background WebP Image with low opacity for premium look */}
        <div className="absolute inset-0 z-0">
          <img
            src="/section-investissement-deals.webp"
            alt=""
            className="w-full h-full object-cover opacity-10 filter brightness-[0.3]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/80 to-transparent" />
        </div>

        {/* Blurred card content underneath */}
        <div className="relative z-10 space-y-4 blur-[3px] transition-all duration-300 select-none">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[#D4A847] bg-[#D4A847]/10 px-2 py-1 rounded">
            {categoryLabel}
          </span>
          <h3 className="text-xl font-bold text-white leading-tight">
            {deal.title}
          </h3>
          <p className="inline-flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="h-4 w-4 text-[#D4A847]" aria-hidden="true" />
            {location}
          </p>
        </div>

        {/* Absolute locked overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-950/85 backdrop-blur-[2px] transition-all duration-300">
          <div className="w-full flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D4A847]/10 border border-[#D4A847]/30 mb-3">
              <LockKeyhole className="h-5 w-5 text-[#D4A847]" aria-hidden="true" />
            </div>
            <h4 className="text-base font-bold text-white">
              Devenez membre pour voir les détails
            </h4>
            <p className="mt-1 text-xs text-slate-400 max-w-[240px]">
              Inscription gratuite, activation par virement bancaire sécurisé.
            </p>

            <div className="mt-5 w-full flex flex-col gap-2 items-center">
              <InterestButton
                opportunityId={deal.id}
                isAuthenticated={false}
              />

              <Link
                href="/auth/signup"
                className="text-xs font-semibold text-[#D4A847] hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A847]"
              >
                S'inscrire pour postuler
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  const amountLabel = typeof deal.amount === "number" ? `${deal.amount.toLocaleString("fr-FR")} €` : "Montant sur demande";
  const trustLevel = deal.trustLevel ?? getSafeTrustLevel({
    documentCount: deal.documentCount ?? 0,
    verificationStatus: deal.verificationStatus ?? "PENDING",
    requiresDoubleVerification: deal.requiresDoubleVerification ?? false,
    approvalCount: deal.approvalCount ?? 0,
    authorStats: deal.authorStats,
  });
  const hasTags = (deal.tags?.length ?? 0) > 0;
  const commonTagCount = match?.commonTagCount ?? 0;
  const shouldShowMatchBadge = commonTagCount > 0;
  const matchBadgeLabel = commonTagCount === 1 ? "1 tag commun" : `${commonTagCount} tags communs`;

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md">
      <Link href={`/dashboard/opportunities/${deal.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
        <div className="aspect-video bg-gradient-to-br from-primary/15 via-secondary/10 to-muted" aria-hidden="true" />
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-lg font-semibold leading-snug">{deal.title}</h2>
              {shouldShowMatchBadge ? (
                <span className="inline-flex min-h-7 items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {matchBadgeLabel}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {location}
              </span>
              <span aria-hidden="true">•</span>
              <span className="font-medium text-foreground">{amountLabel}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <TrustBadge level={trustLevel} animated={trustLevel === "or"} />
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground" aria-label={`${deal.documentCount} document(s)`}>
              <Paperclip className="h-4 w-4" aria-hidden="true" />
              {deal.documentCount}
            </span>
          </div>
        </div>
      </Link>
      {hasTags ? (
        <div className="px-4">
          <TagChips tags={deal.tags ?? []} interactive={false} />
        </div>
      ) : null}
      <div className="px-4 pb-4">
        <WhatsAppCTA
          phoneNumber={deal.author?.phone}
          prefilledMessage={`Bonjour, je suis intéressé(e) par votre deal ${deal.title} sur IBC.`}
        />
      </div>
    </article>
  );
}

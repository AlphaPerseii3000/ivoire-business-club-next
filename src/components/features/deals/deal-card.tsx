import Link from "next/link";
import { MapPin, Paperclip } from "lucide-react";

import { TrustBadge } from "@/components/features/deals/trust-badge";
import { TagChips } from "@/components/features/tags/tag-chips";
import { WhatsAppCTA } from "@/components/features/deals/whatsapp-cta";
import type { OpportunityMatchMetadata } from "@/lib/matching";
import type { SelectedTag } from "@/lib/tags";
import { getSafeTrustLevel, type TrustLevel } from "@/lib/trust-level";

type DealCardDeal = {
  id: string;
  title: string;
  amount: number | null;
  location?: string | null;
  verificationStatus: string;
  documentCount: number;
  trustLevel?: TrustLevel | null;
  requiresDoubleVerification?: boolean;
  approvalCount?: number;
  authorStats?: {
    validatedDealsCount?: number | null;
    averageRating?: number | null;
  } | null;
  tags?: SelectedTag[];
  author: { phone?: string | null };
};

type DealCardProps = {
  deal: DealCardDeal;
  match?: OpportunityMatchMetadata;
};

export function DealCard({ deal, match }: DealCardProps) {
  const location = deal.location?.trim() ? deal.location : "Localisation non renseignée";
  const amountLabel = typeof deal.amount === "number" ? `${deal.amount.toLocaleString("fr-FR")} €` : "Montant sur demande";
  const trustLevel = deal.trustLevel ?? getSafeTrustLevel({
    documentCount: deal.documentCount,
    verificationStatus: deal.verificationStatus,
    requiresDoubleVerification: deal.requiresDoubleVerification,
    approvalCount: deal.approvalCount,
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
          phoneNumber={deal.author.phone}
          prefilledMessage={`Bonjour, je suis intéressé(e) par votre deal ${deal.title} sur IBC.`}
        />
      </div>
    </article>
  );
}

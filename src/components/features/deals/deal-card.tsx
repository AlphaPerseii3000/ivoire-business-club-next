import Link from "next/link";
import { MapPin, Paperclip } from "lucide-react";

import { TrustBadge } from "@/components/features/deals/trust-badge";
import { WhatsAppCTA } from "@/components/features/deals/whatsapp-cta";
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
  author: { phone?: string | null };
};

type DealCardProps = {
  deal: DealCardDeal;
};

export function DealCard({ deal }: DealCardProps) {
  const location = deal.location?.trim() ? deal.location : "Localisation non renseignée";
  const amountLabel = typeof deal.amount === "number" ? `${deal.amount.toLocaleString("fr-FR")} €` : "Montant sur demande";
  const trustLevel = deal.trustLevel ?? getSafeTrustLevel({
    documentCount: deal.documentCount,
    verificationStatus: deal.verificationStatus,
    requiresDoubleVerification: deal.requiresDoubleVerification,
    approvalCount: deal.approvalCount,
    authorStats: deal.authorStats,
  });

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md">
      <Link href={`/dashboard/opportunities/${deal.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
        <div className="aspect-video bg-gradient-to-br from-primary/15 via-secondary/10 to-muted" aria-hidden="true" />
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold leading-snug">{deal.title}</h2>
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
      <div className="px-4 pb-4">
        <WhatsAppCTA
          phoneNumber={deal.author.phone}
          prefilledMessage={`Bonjour, je suis intéressé(e) par votre deal ${deal.title} sur IBC.`}
        />
      </div>
    </article>
  );
}

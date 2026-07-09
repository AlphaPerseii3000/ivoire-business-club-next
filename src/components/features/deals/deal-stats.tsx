import { Heart, MessageCircle } from "lucide-react";

export type DealStatsProps = {
  contactLogCount: number;
  interestCount: number;
  isOwnDeal: boolean;
};

export function DealStats({ contactLogCount, interestCount, isOwnDeal }: DealStatsProps) {
  if (!isOwnDeal) return null;

  const whatsappCount = contactLogCount ?? 0;
  const interests = interestCount ?? 0;
  const hasWhatsAppActivity = whatsappCount > 0;
  const hasInterestActivity = interests > 0;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground" data-testid="deal-stats">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${hasWhatsAppActivity ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300" : "bg-muted/50 text-muted-foreground"}`}
        title="Clics WhatsApp"
        data-testid="deal-stats-whatsapp"
      >
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
        {whatsappCount}
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${hasInterestActivity ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-muted/50 text-muted-foreground"}`}
        title="Intérêts manifestés"
        data-testid="deal-stats-interests"
      >
        <Heart className="h-3.5 w-3.5" aria-hidden="true" />
        {interests}
      </span>
    </div>
  );
}

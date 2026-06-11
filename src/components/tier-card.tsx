import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getTierConfig, type MembershipTier } from "@/lib/tier-config";
import { ShinyText } from "@/components/ui/shiny-text";

type TierCardProps = {
  tier: MembershipTier;
  isSelected?: boolean;
  isCurrent?: boolean;
  actionLabel?: string;
  href?: string;
  onSelect?: (tier: MembershipTier) => void;
  disabled?: boolean;
  className?: string;
};

export function TierCard({
  tier,
  isSelected = false,
  isCurrent = false,
  actionLabel,
  href,
  onSelect,
  disabled = false,
  className,
}: TierCardProps) {
  const config = getTierConfig(tier);
  const label = actionLabel ?? config.ctaLabel;
  const isPressed = isSelected || isCurrent;

  const statusArea = isSelected || isCurrent ? (
    <div className="flex flex-wrap gap-2" aria-label="Statut du tier">
      {isSelected ? (
        <Badge className="border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100">
          ✓ Sélectionné
        </Badge>
      ) : null}
      {isCurrent ? (
        <Badge className={config.badgeClassName}>✓ Offre actuelle</Badge>
      ) : null}
    </div>
  ) : null;

  const actionClassName = cn(
    "min-h-11 w-full px-4 text-center text-sm font-semibold focus-visible:ring-3 focus-visible:ring-ring/50",
    disabled ? "pointer-events-none opacity-60" : null
  );

  return (
    <Card
      data-testid="tier-card"
      className={cn(
        "relative h-full gap-5 border-2 p-2 transition-shadow focus-within:ring-3 focus-within:ring-ring/40",
        config.cardClassName,
        isPressed ? "ring-2 ring-offset-2 ring-offset-background" : null,
        isSelected ? "ring-teal-500" : null,
        isCurrent ? "ring-violet-500" : null,
        className
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-2xl font-bold tracking-tight">{config.label}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{config.shortDescription}</p>
          </div>
          {tier === "GRAND_FRERE" ? (
            <Badge className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 overflow-hidden whitespace-nowrap">
              <ShinyText text="Recommandé" color="currentColor" shineColor="#FFFFFF" speed={2.5} className="font-semibold" />
            </Badge>
          ) : null}
        </div>
        <p className="text-3xl font-bold text-foreground" aria-label={`${config.price} euros par mois`}>
          {config.priceLabel}
        </p>
        {statusArea}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6">
        <ul className="space-y-3 text-sm" aria-label={`Avantages ${config.label}`}>
          {config.benefits.map((benefit) => (
            <li key={benefit} className="flex gap-3 leading-6">
              <Check className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-300" aria-hidden="true" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-2">
          {href ? (
            <a
              href={href}
              aria-disabled={disabled ? true : undefined}
              className={cn(buttonVariants({ variant: tier === "GRAND_FRERE" ? "default" : "outline" }), actionClassName)}
            >
              {label}
            </a>
          ) : (
            <Button
              type="button"
              variant={tier === "GRAND_FRERE" ? "default" : "outline"}
              className={actionClassName}
              aria-pressed={isPressed ? true : false}
              disabled={disabled}
              onClick={() => onSelect?.(tier)}
            >
              {label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

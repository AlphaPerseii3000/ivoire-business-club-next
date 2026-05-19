import { Award, FileCheck2, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TrustLevel } from "@/lib/trust-level";

type TrustBadgeProps = {
  level?: TrustLevel;
  size?: "sm" | "md";
  animated?: boolean;
  showTooltip?: boolean;
  className?: string;
};

const TRUST_BADGE_CONFIG: Record<TrustLevel, { label: string; description: string; className: string; Icon: typeof ShieldCheck }> = {
  bronze: {
    label: "Bronze",
    description: "Documents juridiques uploadés par le porteur.",
    className: "border-[#FCD34D] bg-[#FFFBEB] text-[#B45309]",
    Icon: FileCheck2,
  },
  argent: {
    label: "Argent",
    description: "Authenticité validée par un admin IBC.",
    className: "border-slate-300 bg-slate-50 text-slate-500",
    Icon: ShieldCheck,
  },
  or: {
    label: "Or",
    description: "Confiance communautaire élevée : 3 deals validés ou plus et reviews moyennes supérieures ou égales à 4,5.",
    className: "border-[#F59E0B] bg-[#FEF3C7] text-[#D97706]",
    Icon: Award,
  },
};

export function TrustBadge({ level = "argent", size = "sm", animated = false, showTooltip = true, className }: TrustBadgeProps) {
  const config = TRUST_BADGE_CONFIG[level];
  const descriptionId = `trust-badge-${level}-description`;
  const shouldAnimate = level === "or" && animated;

  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border font-medium",
          config.className,
          size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs",
          shouldAnimate ? "motion-safe:animate-pulse" : "",
          className,
        )}
        aria-label={`Niveau de confiance ${config.label} — ${config.description}`}
        aria-describedby={showTooltip ? descriptionId : undefined}
        title={showTooltip ? config.description : undefined}
      >
        <config.Icon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />
        {config.label}
      </span>
      {showTooltip ? (
        <span id={descriptionId} className="sr-only">
          {config.description}
        </span>
      ) : null}
    </span>
  );
}

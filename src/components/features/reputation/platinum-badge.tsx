import { Award } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PlatinumDisplayState } from "@/lib/reputation";

type PlatinumBadgeProps = {
  state: PlatinumDisplayState;
  className?: string;
};

const activeTooltip = "Membre distingué : 3+ deals validés et excellentes reviews";
const maintainTooltip = "Membre distingué : 3+ deals validés et excellentes reviews. À maintenir : continuez à préserver la qualité de vos avis.";

export function PlatinumBadge({ state, className }: PlatinumBadgeProps) {
  const isVisible = state !== "none";
  const isMaintain = state === "maintain";
  const tooltip = isMaintain ? maintainTooltip : activeTooltip;
  const badgeClassName = isMaintain
    ? "border-amber-300 bg-amber-50 text-amber-900"
    : "border-yellow-400 bg-yellow-100 text-yellow-900";

  return isVisible ? (
    <span
      className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", badgeClassName, className)}
      title={tooltip}
      aria-label={tooltip}
    >
      <Award className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Membre Platinum</span>
      {isMaintain ? <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">À maintenir</span> : null}
    </span>
  ) : null;
}

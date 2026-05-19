import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type TrustBadgeProps = {
  level?: "argent";
  size?: "sm" | "md";
  className?: string;
};

export function TrustBadge({ level = "argent", size = "sm", className }: TrustBadgeProps) {
  const label = level === "argent" ? "Argent" : "Argent";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs",
        className,
      )}
      aria-label={`Niveau de confiance ${label}`}
    >
      <ShieldCheck className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />
      {label}
    </span>
  );
}

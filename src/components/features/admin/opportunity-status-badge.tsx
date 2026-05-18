import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VerificationStatusInput } from "@/lib/validations";

export const OPPORTUNITY_STATUS_LABELS: Record<VerificationStatusInput, string> = {
  PENDING: "En attente",
  EN_COURS: "En cours",
  VERIFIED: "Vérifié",
  REJECTED: "Refusé",
};

const STATUS_CLASSES: Record<VerificationStatusInput, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  EN_COURS: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  VERIFIED: "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200",
  REJECTED: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
};

const DOT_CLASSES: Record<VerificationStatusInput, string> = {
  PENDING: "bg-amber-500",
  EN_COURS: "bg-blue-500",
  VERIFIED: "bg-green-500",
  REJECTED: "bg-red-500",
};

export function OpportunityStatusBadge({ status, className }: { status: VerificationStatusInput; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 border", STATUS_CLASSES[status], className)}>
      <span className={cn("h-2 w-2 rounded-full", DOT_CLASSES[status])} aria-hidden="true" />
      {OPPORTUNITY_STATUS_LABELS[status]}
    </Badge>
  );
}

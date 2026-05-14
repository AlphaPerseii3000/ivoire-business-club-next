"use client";

import { cn } from "@/lib/utils";

export type SubscriptionStatus =
  | "TRIAL"
  | "PENDING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED";

interface Step {
  key: SubscriptionStatus;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  {
    key: "TRIAL",
    label: "Essai",
    description: "Période d'essai activée",
  },
  {
    key: "PENDING",
    label: "En attente",
    description: "Paiement par virement en cours",
  },
  {
    key: "ACTIVE",
    label: "Actif",
    description: "Abonnement confirmé",
  },
];

interface SubscriptionStatusTrackerProps {
  status: SubscriptionStatus;
  className?: string;
}

export default function SubscriptionStatusTracker({
  status,
  className,
}: SubscriptionStatusTrackerProps) {
  const activeIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div className={cn("w-full max-w-sm", className)}>
      <ol className="relative flex flex-col gap-6 pl-4">
        {STEPS.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <li key={step.key} className="flex items-start gap-4">
              {/* Step dot / line */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    isCompleted
                      ? "border-teal-700 bg-teal-700 text-white dark:border-teal-500 dark:bg-teal-500 dark:text-white"
                      : isCurrent
                        ? "border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-black"
                        : "border-muted-foreground/30 text-muted-foreground dark:border-muted-foreground/20"
                  )}
                >
                  {isCompleted ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < STEPS.length - 1 ? (
                  <div
                    className={cn(
                      "h-full w-0.5 flex-1 min-h-[24px]",
                      isCompleted
                        ? "bg-teal-700 dark:bg-teal-500"
                        : "bg-muted-foreground/20 dark:bg-muted-foreground/10"
                    )}
                  />
                ) : null}
              </div>

              {/* Text */}
              <div className="flex flex-col pt-0.5">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent
                      ? "text-amber-600 dark:text-amber-400"
                      : isCompleted
                        ? "text-teal-800 dark:text-teal-300"
                        : "text-muted-foreground"
                  )}
                >
                  {step.label}
                  {isCurrent && status === "PENDING" ? (
                    <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse dark:bg-amber-400" />
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  {step.description}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

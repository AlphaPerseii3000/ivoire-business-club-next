"use client";

import { cn } from "@/lib/utils";

export type SubscriptionStatus =
  | "TRIAL"
  | "PENDING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED";

interface Step {
  key: "TRIAL" | "PENDING" | "ACTIVE";
  label: string;
  description: string;
}

const STEPS: Step[] = [
  {
    key: "TRIAL",
    label: "Essai",
    description: "Compte prêt pour le virement",
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

const INVALID_STATUS_COPY: Partial<Record<SubscriptionStatus, { title: string; description: string }>> = {
  CANCELLED: {
    title: "Abonnement annulé",
    description: "Votre abonnement n'est plus actif. Renouvelez votre accès pour consulter les deals premium.",
  },
  PAST_DUE: {
    title: "Paiement en retard",
    description: "Votre abonnement demande une régularisation avant de réactiver l'accès premium.",
  },
};

type StepTimestamps = Partial<Record<"TRIAL" | "PENDING" | "ACTIVE", Date | string | null | undefined>>;

interface SubscriptionStatusTrackerProps {
  status: SubscriptionStatus;
  className?: string;
  submittedAt?: Date | string | null;
  validatedAt?: Date | string | null;
  cancelledAt?: Date | string | null;
  stepTimestamps?: StepTimestamps;
}

function formatTimestamp(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActiveIndex(status: SubscriptionStatus) {
  if (status === "ACTIVE") {
    return 2;
  }

  if (status === "PENDING") {
    return 1;
  }

  if (status === "TRIAL") {
    return 0;
  }

  return -1;
}

export default function SubscriptionStatusTracker({
  status,
  className,
  submittedAt,
  validatedAt,
  cancelledAt,
  stepTimestamps,
}: SubscriptionStatusTrackerProps) {
  const activeIndex = getActiveIndex(status);
  const invalidCopy = INVALID_STATUS_COPY[status];
  const timestamps: StepTimestamps = {
    TRIAL: stepTimestamps?.TRIAL ?? submittedAt,
    PENDING: stepTimestamps?.PENDING ?? submittedAt,
    ACTIVE: stepTimestamps?.ACTIVE ?? validatedAt,
  };
  const invalidTimestamp = formatTimestamp(cancelledAt);

  return (
    <div className={cn("w-full max-w-sm", className)}>
      {invalidCopy ? (
        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">{invalidCopy.title}</p>
          <p className="mt-1 text-muted-foreground">{invalidCopy.description}</p>
          {invalidTimestamp ? (
            <p className="mt-2 text-xs text-muted-foreground">Mis à jour le {invalidTimestamp}</p>
          ) : null}
        </div>
      ) : null}

      <ol className="relative flex flex-col gap-6 pl-4" aria-label="Cycle de vie de l'abonnement">
        {STEPS.map((step, index) => {
          const isCompleted = activeIndex >= 0 ? index < activeIndex : false;
          const isCurrent = activeIndex >= 0 ? index === activeIndex : false;
          const showPendingPulse = isCurrent ? status === "PENDING" : false;
          const stepTimestamp = formatTimestamp(timestamps[step.key]);

          return (
            <li key={step.key} className="flex items-start gap-4">
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
                      aria-hidden="true"
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
                  {showPendingPulse ? (
                    <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-amber-500 motion-safe:animate-pulse motion-reduce:animate-none dark:bg-amber-400" />
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  {step.description}
                </span>
                {stepTimestamp ? (
                  <time className="mt-1 text-xs text-muted-foreground" dateTime={new Date(timestamps[step.key] as string | Date).toISOString()}>
                    {stepTimestamp}
                  </time>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

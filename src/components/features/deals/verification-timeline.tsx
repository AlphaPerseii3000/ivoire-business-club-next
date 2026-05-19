import { CheckCircle2, Circle, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { hasCommunityGoldCriteria, isDoubleVerificationComplete, type TrustLevel } from "@/lib/trust-level";

type VerificationTimelineProps = {
  documentCount: number;
  verificationStatus: string;
  trustLevel: TrustLevel | null;
  requiresDoubleVerification?: boolean;
  approvalCount?: number;
  averageRating?: number | null;
  validatedDealsCount?: number;
};

type StepState = "complete" | "current" | "pending";

type TimelineStep = {
  label: string;
  description: string;
  state: StepState;
};

function getStepClassName(state: StepState) {
  if (state === "complete") return "border-green-600 bg-green-50 text-green-700";
  if (state === "current") return "border-primary bg-primary/10 text-primary";
  return "border-muted bg-muted/50 text-muted-foreground";
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "complete") return <CheckCircle2 className="h-5 w-5" aria-hidden="true" />;
  if (state === "current") return <Clock3 className="h-5 w-5" aria-hidden="true" />;
  return <Circle className="h-5 w-5" aria-hidden="true" />;
}

export function VerificationTimeline({
  documentCount,
  verificationStatus,
  trustLevel,
  requiresDoubleVerification = false,
  approvalCount = 0,
  averageRating = null,
  validatedDealsCount = 0,
}: VerificationTimelineProps) {
  const documentsComplete = documentCount > 0;
  const ibcComplete = verificationStatus === "VERIFIED" || (requiresDoubleVerification && approvalCount >= 2);
  const reviewsComplete = trustLevel === "or" || hasCommunityGoldCriteria({ authorStats: { averageRating, validatedDealsCount } });
  const doubleVerificationComplete = isDoubleVerificationComplete({ requiresDoubleVerification, approvalCount });
  const ibcCurrent = documentsComplete && !ibcComplete;
  const reviewsCurrent = ibcComplete && !reviewsComplete;
  const doubleVerificationText = requiresDoubleVerification
    ? `Double vérification ${doubleVerificationComplete ? "complétée" : "requise"} (${approvalCount}/2)`
    : "Validation admin IBC";

  const steps: TimelineStep[] = [
    {
      label: "Documents uploadés",
      description: documentsComplete ? `${documentCount} document(s) disponible(s)` : "En attente des documents juridiques",
      state: documentsComplete ? "complete" : "current",
    },
    {
      label: "Vérifié par IBC",
      description: ibcComplete ? doubleVerificationText : doubleVerificationText,
      state: ibcComplete ? "complete" : ibcCurrent ? "current" : "pending",
    },
    {
      label: "Reviews communautaires",
      description: reviewsComplete ? "Confiance communautaire élevée" : "Reviews requises pour atteindre le niveau Or",
      state: reviewsComplete ? "complete" : reviewsCurrent ? "current" : "pending",
    },
  ];

  return (
    <section className="rounded-xl border bg-card p-4" aria-labelledby="verification-timeline-title">
      <h2 id="verification-timeline-title" className="font-semibold">
        Timeline de vérification
      </h2>
      <ol className="mt-4 flex gap-3 overflow-x-auto pb-2" aria-label="Étapes de vérification du deal">
        {steps.map((step, index) => (
          <li key={step.label} className="min-w-[11rem] flex-1">
            <div className={cn("h-full rounded-xl border p-3", getStepClassName(step.state))}>
              <div className="flex items-center gap-2">
                <StepIcon state={step.state} />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Étape {index + 1} — {step.state === "complete" ? "complétée" : step.state === "current" ? "en cours" : "à venir"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{step.label}</p>
              <p className="mt-1 text-xs">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

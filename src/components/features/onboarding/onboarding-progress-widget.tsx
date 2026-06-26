"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type OnboardingProgressWidgetProps = {
  emailVerified: boolean;
  onboardingCompleted: boolean;
  priority?: boolean;
};

const TOTAL_STEPS = 2;

export function OnboardingProgressWidget({
  emailVerified,
  onboardingCompleted,
  priority = false,
}: OnboardingProgressWidgetProps) {
  const completedSteps = Number(emailVerified) + Number(onboardingCompleted);
  const percentage = Math.round((completedSteps / TOTAL_STEPS) * 100);

  const bothComplete = emailVerified ? onboardingCompleted : false;
  const anyIncomplete = !emailVerified ? true : !onboardingCompleted;
  const showPriorityStyle = priority ? anyIncomplete : false;
  const showPulseAnimation = showPriorityStyle;

  return bothComplete ? null : (
    <div
      data-testid="onboarding-progress-widget"
      className={cn(
        "mb-6 rounded-lg border p-4",
        showPriorityStyle
          ? "border-destructive bg-destructive/5"
          : "border-amber-200 bg-amber-50"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">Finalise ton inscription</h2>
          <p className="text-sm text-muted-foreground">
            Complète ces 2 étapes pour accéder à toutes les fonctionnalités du club.
          </p>
        </div>
        <div className="text-right">
          <span
            data-testid="onboarding-percentage"
            className="text-2xl font-bold text-primary"
          >
            {percentage}%
          </span>
        </div>
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          data-testid="onboarding-progress-bar"
          className={cn(
            "h-full rounded-full transition-all duration-500",
            showPriorityStyle ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>

      <ul className="space-y-3" role="list" aria-label="Étapes d'inscription">
        {emailVerified ? null : (
          <li
            data-testid="onboarding-step-email-pending"
            className={cn(
              "flex items-start justify-between gap-3 rounded-md p-2",
              showPulseAnimation ? "animate-pulse" : ""
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 text-destructive"
                aria-hidden="true"
                data-testid="step-email-status"
              >
                ✗
              </span>
              <div>
                <p className="font-medium">Vérifier mon email</p>
                <p className="text-sm text-muted-foreground">
                  Clique sur le lien envoyé ou demande un nouvel email.
                </p>
              </div>
            </div>
            <Link
              href="/auth/verify-email"
              className={cn(
                "inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              )}
              data-testid="cta-verify-email"
            >
              Vérifier mon email
            </Link>
          </li>
        )}

        {emailVerified ? (
          <li
            data-testid="onboarding-step-email-done"
            className="flex items-start gap-3 rounded-md p-2"
          >
            <span
              className="mt-0.5 text-emerald-600"
              aria-hidden="true"
              data-testid="step-email-status"
            >
              ✓
            </span>
            <div>
              <p className="font-medium">Vérifier mon email</p>
              <p className="text-sm text-muted-foreground">Email confirmé.</p>
            </div>
          </li>
        ) : null}

        {onboardingCompleted ? null : (
          <li
            data-testid="onboarding-step-profile-pending"
            className={cn(
              "flex items-start justify-between gap-3 rounded-md p-2",
              showPulseAnimation ? "animate-pulse" : ""
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 text-destructive"
                aria-hidden="true"
                data-testid="step-profile-status"
              >
                ✗
              </span>
              <div>
                <p className="font-medium">Compléter mon profil</p>
                <p className="text-sm text-muted-foreground">
                  Renseigne tes informations pour rejoindre le réseau.
                </p>
              </div>
            </div>
            <Link
              href="/onboarding/complete-profile"
              className={cn(
                "inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              )}
              data-testid="cta-complete-profile"
            >
              Compléter mon profil
            </Link>
          </li>
        )}

        {onboardingCompleted ? (
          <li
            data-testid="onboarding-step-profile-done"
            className="flex items-start gap-3 rounded-md p-2"
          >
            <span
              className="mt-0.5 text-emerald-600"
              aria-hidden="true"
              data-testid="step-profile-status"
            >
              ✓
            </span>
            <div>
              <p className="font-medium">Compléter mon profil</p>
              <p className="text-sm text-muted-foreground">Profil complété.</p>
            </div>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getTierBadgeConfig } from "@/lib/tier-config";
import { cn } from "@/lib/utils";

type SubscriptionActivationNoticeProps = {
  subscriptionId: string;
  tier: string;
  ctaHref?: string;
  className?: string;
};

export function SubscriptionActivationNotice({
  subscriptionId,
  tier,
  ctaHref = "/opportunities",
  className,
}: SubscriptionActivationNoticeProps) {
  const storageKey = `ibc:subscription-activation-notice:${subscriptionId}`;
  const [isDismissed, setIsDismissed] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.localStorage.getItem(storageKey) === "dismissed"
  );
  const tierBadge = getTierBadgeConfig(tier);

  function dismiss() {
    window.localStorage.setItem(storageKey, "dismissed");
    setIsDismissed(true);
  }

  if (isDismissed) {
    return null;
  }

  return (
    <section
      aria-label="Notification d'activation d'abonnement"
      className={cn(
        "rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm dark:border-teal-900 dark:bg-teal-950/50",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-reduce:animate-none",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl" aria-hidden="true">🎉</span>
            <h2 className="text-lg font-semibold text-teal-950 dark:text-teal-50">
              Bienvenue dans le club IBC !
            </h2>
            <Badge variant="outline" className={tierBadge.className}>
              {tierBadge.label}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-teal-900 dark:text-teal-100">
            Ton abonnement est activé. Tu peux maintenant accéder aux deals premium et découvrir les opportunités vérifiées.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={ctaHref}
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Découvrir les deals
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Masquer
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

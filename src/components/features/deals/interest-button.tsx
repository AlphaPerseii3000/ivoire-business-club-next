"use client";

import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type InterestButtonProps = {
  opportunityId: string;
  isAuthenticated: boolean;
  initialInterested?: boolean;
  onInterestRecorded?: () => void;
};

export function InterestButton({
  opportunityId,
  isAuthenticated,
  initialInterested = false,
  onInterestRecorded,
}: InterestButtonProps) {
  const [isInterested, setIsInterested] = useState(initialInterested);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  async function handleClick() {
    setError(null);

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (isInterested || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error ?? "Impossible d'enregistrer votre intérêt pour le moment.");
        return;
      }

      setIsInterested(true);
      if (payload?.data?.created) {
        onInterestRecorded?.();
      }
    } catch {
      setError("Erreur réseau. Réessayez dans quelques instants.");
    } finally {
      setIsLoading(false);
    }
  }

  const label = isInterested ? "Intérêt enregistré" : isLoading ? "Enregistrement..." : "Intéressé(e)";

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={isInterested ? "secondary" : "outline"}
        size="lg"
        onClick={handleClick}
        disabled={isInterested || isLoading}
        aria-label={label}
      >
        {isInterested ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {label}
      </Button>

      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}

      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connectez-vous pour marquer votre intérêt</DialogTitle>
            <DialogDescription>
              Créez un compte ou connectez-vous pour signaler au porteur du deal que vous êtes intéressé(e), sans engagement financier.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" render={<Link href="/auth/signin" />}>
              Se connecter
            </Button>
            <Button render={<Link href="/auth/signup" />}>
              S&apos;inscrire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

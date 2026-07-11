"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AdminMemberInviteButton({
  userId,
  disabled,
}: {
  userId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleClick() {
    if (isSending || cooldown > 0) return;
    setIsSending(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Une erreur est survenue");
      }
      toast.success("Invitation à définir le mot de passe envoyée.");
      setCooldown(30);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue"
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Button
      type="button"
      className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
      variant="outline"
      disabled={disabled || isSending || cooldown > 0}
      onClick={() => void handleClick()}
    >
      {isSending
        ? "Envoi en cours..."
        : cooldown > 0
        ? `Renvoyer l'invitation (${cooldown}s)`
        : "Inviter à définir le mot de passe"}
    </Button>
  );
}

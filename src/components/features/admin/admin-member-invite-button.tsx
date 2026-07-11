"use client";

import { useState, useEffect, useRef } from "react";
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
  const isSendingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleClick() {
    if (isSending || isSendingRef.current || cooldown > 0) return;
    isSendingRef.current = true;
    setIsSending(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const contentType = response.headers.get("content-type");
      let payload: any = {};
      if (contentType && contentType.includes("application/json")) {
        payload = await response.json().catch(() => ({}));
      } else {
        throw new Error("Une erreur serveur est survenue.");
      }

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
      isSendingRef.current = false;
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


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AdminMemberReminderButton({ userId, disabled }: { userId: string; disabled: boolean }) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  async function handleClick() {
    if (isSending) return;
    setIsSending(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Une erreur est survenue");
      }
      toast.success("Relance envoyée avec succès.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Button
      type="button"
      className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
      disabled={disabled || isSending}
      onClick={() => void handleClick()}
    >
      {isSending ? "Envoi en cours..." : "Relancer par email"}
    </Button>
  );
}

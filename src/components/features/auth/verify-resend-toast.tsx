"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type VerifyResendToastProps = {
  message?: string;
};

export function VerifyResendToast({
  message = "Un email de vérification vient de vous être envoyé",
}: VerifyResendToastProps) {
  useEffect(() => {
    toast.success(message);
  }, [message]);

  return null;
}

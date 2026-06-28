"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import posthog from "posthog-js";

export default function SignOutPage() {
  useEffect(() => {
    posthog.reset();
    const timer = setTimeout(() => {
      signOut({ redirectTo: "/" });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Déconnexion en cours…</p>
      </div>
    </div>
  );
}

"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut({ redirectTo: "/" });
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors text-left disabled:opacity-50"
    >
      {loading ? "Déconnexion..." : "🚪 Déconnexion"}
    </button>
  );
}

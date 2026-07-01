"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { SquarePower } from "lucide-react";

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
      className="logout-btn w-full rounded-md px-3 py-2 text-sm transition-colors text-left disabled:opacity-50 cursor-pointer"
    >
      <SquarePower className="sidebar-icon" />
      <span>{loading ? "Déconnexion..." : "Déconnexion"}</span>
    </button>
  );
}


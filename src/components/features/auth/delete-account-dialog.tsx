"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { TriangleAlertIcon } from "lucide-react";

export default function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isConfirmEnabled = confirmation === "SUPPRIMER";

  const handleDelete = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "SUPPRIMER" }),
      });

      if (!res.ok) {
        const data = await res.json();

        if (res.status === 400) {
          setError("Confirmation incorrecte.");
          setLoading(false);
          return;
        }

        toast.error("Une erreur est survenue. Veuillez réessayer.");
        setLoading(false);
        return;
      }

      // Success — sign out and redirect to landing page
      await signOut({ redirectTo: "/" });
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setConfirmation(""); setError(""); } }}>
      <DialogTrigger render={<Button variant="destructive" className="mt-4" />}>
        Supprimer mon compte
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlertIcon className="size-5" />
            Supprimer mon compte
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Toutes vos données (profil, abonnements, opportunités) seront supprimées définitivement. Vous ne pourrez pas récupérer votre compte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label htmlFor="delete-confirmation" className="text-sm font-medium">
            Tapez <strong>SUPPRIMER</strong> pour confirmer
          </label>
          <Input
            id="delete-confirmation"
            type="text"
            value={confirmation}
            onChange={(e) => {
              setConfirmation(e.target.value);
              setError("");
            }}
            placeholder="SUPPRIMER"
            autoComplete="off"
            className="text-center"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />} disabled={loading}>
            Annuler
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmEnabled || loading}
          >
            {loading ? "Suppression..." : "Supprimer définitivement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TIER_LABELS: Record<string, string> = {
  AFFRANCHI: "Affranchi",
  GRAND_FRERE: "Grand Frère",
  BOSS: "Boss",
};

const TIER_COLORS: Record<string, string> = {
  AFFRANCHI: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800",
  GRAND_FRERE: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-100 dark:border-purple-800",
  BOSS: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800",
};

type Expert = {
  id: string;
  name: string;
  slug: string;
  title: string;
  bio: string;
  photoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  specialties?: string | null;
  requiredTier: string;
  isPublished: boolean;
};

type ExpertsListTableProps = {
  experts: Expert[];
};

export default function ExpertsListTable({ experts }: ExpertsListTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");

  const handlePublishToggle = (expert: Expert) => {
    const newPublishState = !expert.isPublished;
    const label = newPublishState ? "publié" : "retiré";

    startTransition(async () => {
      try {
        const res = await fetch(`/api/experts/${expert.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: newPublishState }),
        });

        if (!res.ok) {
          const body = await res.json();
          toast.error(body.error ?? `Impossible de changer le statut de l'expert.`);
          return;
        }

        toast.success(`Expert ${label} avec succès.`);
        router.refresh();
      } catch {
        toast.error("Erreur réseau. Veuillez réessayer.");
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteId) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/experts/${deleteId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const body = await res.json();
          toast.error(body.error ?? "Impossible de supprimer l'expert.");
          return;
        }

        toast.success("Expert supprimé avec succès.");
        setDeleteId(null);
        router.refresh();
      } catch {
        toast.error("Erreur réseau. Veuillez réessayer.");
      }
    });
  };

  const renderStatusBadge = (published: boolean) => {
    return published ? (
      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800">
        Publié
      </Badge>
    ) : (
      <Badge variant="secondary">Brouillon</Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Photo</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Spécialités</TableHead>
              <TableHead>Tier Requis</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {experts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  Aucun expert trouvé.
                </TableCell>
              </TableRow>
            ) : null}

            {experts.map((expert) => {
              const specialtiesArray = expert.specialties
                ? expert.specialties.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

              return (
                <TableRow key={expert.id} data-testid={`expert-row-${expert.id}`}>
                  <TableCell>
                    {expert.photoUrl ? (
                      <img
                        src={expert.photoUrl}
                        alt={expert.name}
                        className="w-10 h-10 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border text-muted-foreground text-xs font-semibold">
                        {expert.name.charAt(0)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold max-w-[150px] truncate" title={expert.name}>
                    {expert.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate" title={expert.title}>
                    {expert.title}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {specialtiesArray.map((spec, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground border"
                        >
                          {spec}
                        </span>
                      ))}
                      {specialtiesArray.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Aucune</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={TIER_COLORS[expert.requiredTier] ?? ""}>
                      {TIER_LABELS[expert.requiredTier] ?? expert.requiredTier}
                    </Badge>
                  </TableCell>
                  <TableCell>{renderStatusBadge(expert.isPublished)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handlePublishToggle(expert)}
                        data-testid={`publish-btn-${expert.id}`}
                      >
                        {expert.isPublished ? "Retirer" : "Publier"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link href={`/admin/experts/${expert.id}/edit`} />
                        }
                        data-testid={`edit-btn-${expert.id}`}
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          setDeleteId(expert.id);
                          setDeleteName(expert.name);
                        }}
                        data-testid={`delete-btn-${expert.id}`}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement la fiche de l'expert{" "}
              <strong>"{deleteName}"</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setDeleteId(null)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              onClick={handleDeleteConfirm}
              disabled={isPending}
              data-testid="confirm-delete-btn"
            >
              {isPending ? "Suppression..." : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

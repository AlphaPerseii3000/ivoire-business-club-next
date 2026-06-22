"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";

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

type Company = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  website?: string | null;
  location?: string | null;
  certifications?: string | null;
  sectors?: string | null;
  isPublished: boolean;
};

type CompaniesListTableProps = {
  companies: Company[];
};

export default function CompaniesListTable({ companies }: CompaniesListTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");

  const handlePublishToggle = (company: Company) => {
    const newPublishState = !company.isPublished;
    const label = newPublishState ? "publiée" : "retirée";

    startTransition(async () => {
      try {
        const res = await fetch(`/api/companies/${company.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: newPublishState }),
        });

        if (!res.ok) {
          const body = await res.json();
          toast.error(body.error ?? `Impossible de changer le statut de l'entreprise.`);
          return;
        }

        toast.success(`Entreprise ${label} avec succès.`);
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
        const res = await fetch(`/api/companies/${deleteId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const body = await res.json();
          toast.error(body.error ?? "Impossible de supprimer l'entreprise.");
          return;
        }

        toast.success("Entreprise supprimée avec succès.");
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
              <TableHead className="w-16">Logo</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Secteurs</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Aucune entreprise trouvée.
                </TableCell>
              </TableRow>
            ) : null}

            {companies.map((company) => {
              const sectorsArray = company.sectors
                ? company.sectors.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

              return (
                <TableRow key={company.id} data-testid={`company-row-${company.id}`}>
                  <TableCell>
                    {company.logoUrl ? (
                      <Image
                        src={company.logoUrl}
                        alt={company.name}
                        width={40}
                        height={40}
                        className="rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border text-muted-foreground text-xs font-semibold">
                        {company.name.charAt(0)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold max-w-[150px] truncate" title={company.name}>
                    {company.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[300px] truncate" title={company.description}>
                    {company.description}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {sectorsArray.map((sector, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground border"
                        >
                          {sector}
                        </span>
                      ))}
                      {sectorsArray.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Aucun</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{renderStatusBadge(company.isPublished)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handlePublishToggle(company)}
                        data-testid={`publish-btn-${company.id}`}
                      >
                        {company.isPublished ? "Retirer" : "Publier"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link href={`/admin/companies/${company.id}/edit`} />
                        }
                        data-testid={`edit-btn-${company.id}`}
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          setDeleteId(company.id);
                          setDeleteName(company.name);
                        }}
                        data-testid={`delete-btn-${company.id}`}
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
              Êtes-vous sûr de vouloir supprimer définitivement la fiche de l'entreprise{" "}
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

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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  CANCELLED: "Annulé",
};

type Event = {
  id: string;
  title: string;
  slug: string;
  description: string;
  startDate: string | Date;
  endDate: string | Date | null;
  location?: string | null;
  coverImagePath?: string | null;
  status: string;
  author?: {
    name: string | null;
  } | null;
};

type EventsListTableProps = {
  events: Event[];
};

export default function EventsListTable({ events }: EventsListTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState<string>("");

  const getNextStatus = (currentStatus: string): "PUBLISHED" | "CANCELLED" | null => {
    switch (currentStatus) {
      case "DRAFT":
        return "PUBLISHED";
      case "PUBLISHED":
        return "CANCELLED";
      default:
        return null;
    }
  };

  const getStatusActionLabel = (currentStatus: string) => {
    switch (currentStatus) {
      case "DRAFT":
        return "Publier";
      case "PUBLISHED":
        return "Annuler";
      default:
        return null;
    }
  };

  const handleStatusChange = (event: Event) => {
    const newStatus = getNextStatus(event.status);
    if (!newStatus) return;

    const label: string = STATUS_LABELS[newStatus];

    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${event.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) {
          const body = await res.json();
          toast.error(body.error ?? "Impossible de modifier le statut de l'événement.");
          return;
        }

        toast.success(`Statut mis à jour : ${label}.`);
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
        const res = await fetch(`/api/events/${deleteId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const body = await res.json();
          toast.error(body.error ?? "Impossible de supprimer l'événement.");
          return;
        }

        toast.success("Événement supprimé avec succès.");
        setDeleteId(null);
        router.refresh();
      } catch {
        toast.error("Erreur réseau. Veuillez réessayer.");
      }
    });
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800">
            Publié
          </Badge>
        );
      case "CANCELLED":
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="secondary">Brouillon</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Lieu</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Aucun événement trouvé.
                </TableCell>
              </TableRow>
            ) : null}

            {events.map((event) => {
              const formattedDate = new Date(event.startDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <TableRow key={event.id} data-testid={`event-row-${event.id}`}>
                  <TableCell className="font-medium max-w-xs truncate" title={event.title}>
                    {event.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formattedDate}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs" title={event.location || undefined}>
                    {event.location ? event.location : "—"}
                  </TableCell>
                  <TableCell>{renderStatusBadge(event.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      {getStatusActionLabel(event.status) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleStatusChange(event)}
                          data-testid={`status-btn-${event.id}`}
                        >
                          {getStatusActionLabel(event.status)}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link href={`/admin/events/${event.id}/edit`} />
                        }
                        data-testid={`edit-btn-${event.id}`}
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          setDeleteId(event.id);
                          setDeleteTitle(event.title);
                        }}
                        data-testid={`delete-btn-${event.id}`}
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
              Êtes-vous sûr de vouloir supprimer définitivement l'événement{" "}
              <strong>"{deleteTitle}"</strong> ? Cette action est irréversible.
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

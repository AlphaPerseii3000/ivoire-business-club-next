"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/event-utils";
import { Check, Search, X, UserX, CreditCard } from "lucide-react";

export type EventRegistrationItem = {
  id: string;
  eventId: string;
  userId: string | null;
  email: string;
  tierSnapshot: string;
  amountPaid: number | null;
  payOnSite: boolean;
  paymentMethod?: string | null;
  status: "REGISTERED" | "ATTENDED" | "CANCELLED" | "NO_SHOW";
  createdAt: string | Date;
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
};

type EventRegistrationsTableProps = {
  eventId: string;
  registrations: EventRegistrationItem[];
};

export default function EventRegistrationsTable({
  eventId,
  registrations: initialRegistrations,
}: EventRegistrationsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const handleUpdateStatus = (registrationId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/events/${eventId}/registrations/${registrationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Impossible de mettre à jour le statut.");
          return;
        }

        toast.success("Statut mis à jour.");
        router.refresh();
      } catch {
        toast.error("Erreur réseau lors de la mise à jour.");
      }
    });
  };

  const filteredRegistrations = initialRegistrations.filter((reg) => {
    const matchesStatus = statusFilter === "ALL" || reg.status === statusFilter;

    const query = search.toLowerCase().trim();
    const nameMatch = reg.user?.name?.toLowerCase().includes(query) ?? false;
    const emailMatch = reg.email?.toLowerCase().includes(query) ?? false;
    const matchesSearch = !query || nameMatch || emailMatch;

    return matchesStatus && matchesSearch;
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "ATTENDED":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300">
            Présent
          </Badge>
        );
      case "CANCELLED":
        return <Badge variant="destructive">Annulé</Badge>;
      case "NO_SHOW":
        return <Badge variant="outline" className="text-muted-foreground">No-Show</Badge>;
      default:
        return <Badge variant="secondary">Inscrit</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtres & Recherche */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-card p-3 rounded-lg border">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <Button
            size="sm"
            variant={statusFilter === "ALL" ? "default" : "outline"}
            onClick={() => setStatusFilter("ALL")}
            className="h-8 text-xs"
          >
            Tous ({initialRegistrations.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "REGISTERED" ? "default" : "outline"}
            onClick={() => setStatusFilter("REGISTERED")}
            className="h-8 text-xs"
          >
            Inscrits
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "ATTENDED" ? "default" : "outline"}
            onClick={() => setStatusFilter("ATTENDED")}
            className="h-8 text-xs"
          >
            Présents
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "CANCELLED" ? "default" : "outline"}
            onClick={() => setStatusFilter("CANCELLED")}
            className="h-8 text-xs"
          >
            Annulés
          </Button>
        </div>
      </div>

      {/* Tableau des inscrits */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Inscrit</TableHead>
              <TableHead>Tier Snapshot</TableHead>
              <TableHead>Règlement</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRegistrations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Aucune inscription trouvée.
                </TableCell>
              </TableRow>
            ) : null}

            {filteredRegistrations.map((reg) => {
              const formattedDate = new Date(reg.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              const isMember = !!reg.userId;

              return (
                <TableRow key={reg.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {reg.user?.name || (isMember ? "Membre" : "Visiteur")}
                      </p>
                      <p className="text-xs text-muted-foreground">{reg.email}</p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {isMember ? reg.tierSnapshot : "Visiteur"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs space-y-0.5">
                      <p className="font-medium">{formatPrice(reg.amountPaid)}</p>
                      {reg.payOnSite ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <CreditCard className="h-3 w-3" /> Sur place
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-medium">
                          {reg.paymentMethod === "BANK_TRANSFER"
                            ? "Virement"
                            : reg.paymentMethod === "WAVE"
                            ? "Wave"
                            : reg.paymentMethod === "ORANGE_MONEY"
                            ? "Orange Money"
                            : "Préalable"}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>{renderStatusBadge(reg.status)}</TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {formattedDate}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1">
                      {reg.status !== "ATTENDED" && (
                        <Button
                          size="icon-sm"
                          variant="outline"
                          title="Marquer comme Présent"
                          disabled={isPending}
                          onClick={() => handleUpdateStatus(reg.id, "ATTENDED")}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        >
                          <Check className="h-4 w-4" />
                          <span className="sr-only">Présent</span>
                        </Button>
                      )}

                      {reg.status !== "NO_SHOW" && (
                        <Button
                          size="icon-sm"
                          variant="outline"
                          title="Marquer comme No-Show"
                          disabled={isPending}
                          onClick={() => handleUpdateStatus(reg.id, "NO_SHOW")}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <UserX className="h-4 w-4" />
                          <span className="sr-only">No-Show</span>
                        </Button>
                      )}

                      {reg.status !== "CANCELLED" && (
                        <Button
                          size="icon-sm"
                          variant="outline"
                          title="Annuler l'inscription"
                          disabled={isPending}
                          onClick={() => handleUpdateStatus(reg.id, "CANCELLED")}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Annuler</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EventRegistrationsTable from "@/components/features/admin/event-registrations-table";
import { ArrowLeft, Users, CheckCircle, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface AdminEventRegistrationsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEventRegistrationsPage({ params }: AdminEventRegistrationsPageProps) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      startDate: true,
      maxCapacity: true,
    },
  });

  if (!event) {
    notFound();
  }

  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId: id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalCount = registrations.length;
  const attendedCount = registrations.filter((r) => r.status === "ATTENDED").length;
  const registeredCount = registrations.filter((r) => r.status === "REGISTERED").length;
  const activeCount = registeredCount + attendedCount;
  const payOnSiteCount = registrations.filter((r) => r.payOnSite).length;

  const eventDateFormatted = new Date(event.startDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* En-tête / Retour */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la liste des événements
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Inscriptions : {event.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {eventDateFormatted} • Capacity : {event.maxCapacity !== null ? `${activeCount} / ${event.maxCapacity}` : `${totalCount} inscrits (Places illimitées)`}
          </p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href={`/events/${event.slug}`} target="_blank">
            Voir la page publique
          </Link>
        </Button>
      </div>

      {/* Cartes de statistiques rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Total Inscriptions</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold">{totalCount}</p>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Confirmés / Présents</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {attendedCount}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>En Attente</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {registeredCount}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Paiement Sur Place</span>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {payOnSiteCount}
          </p>
        </div>
      </div>

      {/* Tableau interactif des inscriptions */}
      <EventRegistrationsTable eventId={event.id} registrations={registrations} />
    </div>
  );
}

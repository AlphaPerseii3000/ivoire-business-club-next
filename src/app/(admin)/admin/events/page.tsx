import { auth } from "@/lib/auth";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

import EventsListTable from "@/components/features/admin/events-list-table";
import { Button } from "@/components/ui/button";

export default async function AdminEventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const currentAdminId = session.user.id;

  const admin = await promoteConfiguredAdminUser(currentAdminId);
  if (admin?.role !== "ADMIN") redirect("/dashboard");

  const events = await prisma.event.findMany({
    orderBy: { startDate: "desc" },
    include: {
      author: {
        select: {
          name: true,
        },
      },
    },
  });

  const serializedEvents = events.map((evt) => ({
    ...evt,
    startDate: evt.startDate.toISOString(),
    endDate: evt.endDate ? evt.endDate.toISOString() : null,
    createdAt: evt.createdAt.toISOString(),
    updatedAt: evt.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Événements</h1>
          <p className="text-sm text-muted-foreground">
            Planifiez et publiez les prochaines rencontres d'Ivoire Business Club.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" render={<Link href="/admin/events/new" />} className="min-h-11" nativeButton={false}>
            Créer un événement
          </Button>
          <a
            href="/admin/dashboard"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Retour au dashboard
          </a>
        </div>
      </div>

      <EventsListTable events={serializedEvents} />
    </div>
  );
}

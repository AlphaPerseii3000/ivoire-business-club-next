import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, CalendarCheck, CalendarDays, Images } from "lucide-react";
import { auth } from "@/lib/auth";
import { getPastEventsWithGalleryPreview } from "@/lib/event-server-utils";
import { PastEventCard } from "@/components/features/events/PastEventCard";

export const dynamic = "force-dynamic";

export default async function DashboardPastEventsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
    return null;
  }

  const pastEvents = (await getPastEventsWithGalleryPreview(20)) || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#D4A847]">
            <CalendarCheck className="size-4" />
            <span>Historique & Galeries</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Événements passés & Galeries
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Revivez les moments forts du club et explorez les galeries photos des sessions précédentes.
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-2 rounded-xl border border-[#D4A847]/40 bg-[#D4A847]/10 px-4 py-2 text-sm font-semibold text-[#D4A847]"
        >
          <Images className="size-4" />
          <span>Événements passés</span>
        </Link>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-medium text-slate-400 hover:border-white/20 hover:text-white transition-colors"
        >
          <CalendarDays className="size-4" />
          <span>Événements à venir</span>
        </Link>
      </div>

      {/* Content grid or empty state */}
      {pastEvents.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pastEvents.map((event) => (
            <PastEventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#D4A847] mb-4">
            <Calendar className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-white">
            Aucun événement passé pour le moment
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Les photos et résumés des événements terminés apparaîtront automatiquement ici dès qu&apos;ils seront archivés.
          </p>
          <div className="mt-6">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4A847] px-5 py-2.5 text-xs font-semibold text-black hover:bg-[#D4A847]/90 transition-colors"
            >
              Découvrir les événements à venir
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

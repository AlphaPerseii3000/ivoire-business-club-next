import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Calendar, MapPin, Info } from "lucide-react";
import { EventGalleryClient } from "./EventGalleryClient";

export default async function DashboardEventGalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const event = await prisma.event.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    include: {
      galleryPhotos: {
        orderBy: { createdAt: "desc" },
        include: {
          uploader: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const now = new Date();
  const isPastEvent = new Date(event.startDate) < now;
  const userRole = (session.user as { role?: string }).role;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Link
          href={`/events/${event.slug}`}
          className="inline-flex items-center text-sm text-slate-400 hover:text-white transition gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la page de l&apos;événement
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="space-y-2">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              Galerie collaborative
            </span>
            <h1 className="text-3xl font-extrabold text-white">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-500" />
                {new Date(event.startDate).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isPastEvent ? (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-6 flex items-start gap-4 text-amber-200">
          <Info className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg text-amber-300">
              Événement à venir
            </h3>
            <p className="text-sm text-amber-200/80 mt-1">
              La galerie collaborative sera ouverte aux contributions dès le début du déroulement de cet événement. Revenez après la rencontre pour consulter et ajouter vos photos !
            </p>
          </div>
        </div>
      ) : (
        <EventGalleryClient
          eventId={event.id}
          initialPhotos={event.galleryPhotos}
          currentUserId={session.user.id}
          currentUserRole={userRole}
          isPastEvent={isPastEvent}
        />
      )}
    </div>
  );
}

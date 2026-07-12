import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventCard } from "@/components/features/events/EventCard";
import { EmptyState } from "@/components/shared/empty-state";
import { sanitizeError } from "@/lib/sanitize-log";
import { EventStatus, EventVisibility } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const title = "Événements, Conférences & Networking | Ivoire Business Club";
const description =
  "Participez aux rencontres, conférences et sessions networking de l'Ivoire Business Club en Côte d'Ivoire et en Europe. Découvrez le calendrier.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    locale: "fr_FR",
  },
};

export default async function EventsPage() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.id);
  const userTier = (session?.user as Record<string, unknown>)?.tier as string | null ?? null;
  const now = new Date();

  let events: Array<{
    id: string;
    slug: string;
    title: string;
    startDate: Date;
    endDate: Date | null;
    location: string | null;
    onlineUrl: string | null;
    coverImagePath: string | null;
    eventType: string;
    visibility: string;
    maxCapacity: number | null;
    pricing: unknown;
  }> = [];

  try {
    const visibilityWhere = isAuthenticated
      ? { in: ["PUBLIC", "PRIVATE"] }
      : "PUBLIC";

    events = await prisma.event.findMany({
      where: {
        status: (EventStatus?.PUBLISHED || "PUBLISHED") as EventStatus,
        visibility: visibilityWhere as any,
        startDate: {
          gte: now,
        },
      },
      orderBy: {
        startDate: "asc",
      },
      select: {
        id: true,
        slug: true,
        title: true,
        startDate: true,
        endDate: true,
        location: true,
        onlineUrl: true,
        coverImagePath: true,
        eventType: true,
        visibility: true,
        maxCapacity: true,
        pricing: true,
      },
    });
  } catch (error) {
    console.error("Failed to fetch events:", sanitizeError(error));
    throw error;
  }

  const hasEvents = events.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-white">
      
      
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 pt-24 py-12 md:py-16">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#D4A847] bg-clip-text text-transparent sm:text-5xl">
            Événements, Conférences & Networking
          </h1>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            Rejoignez-nous lors de nos prochaines rencontres, conférences et sessions de networking en Côte d&rsquo;Ivoire.
          </p>
        </div>

        {hasEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="events-grid">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isAuthenticated={isAuthenticated}
                userTier={userTier}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aucun événement à venir"
            description="Revenez bientôt !"
          />
        )}
      </main>

          </div>
  );
}

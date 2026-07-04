import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventCard } from "@/components/features/events/EventCard";
import { EmptyState } from "@/components/shared/empty-state";
import { Footer } from "@/components/landing/footer";
import LandingMobileNav from "@/components/landing/mobile-nav";
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
      ? { in: [EventVisibility.PUBLIC, EventVisibility.PRIVATE] }
      : EventVisibility.PUBLIC;

    events = await prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        visibility: visibilityWhere,
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
      <LandingMobileNav />

      <header className="hidden md:flex sticky top-0 z-50 border-b border-white/10 bg-[#090D16]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Image src="/logo-ibc.webp" alt="IBC Logo" width={32} height={32} className="h-8 w-auto" />
            <span className="hidden sm:inline bg-gradient-to-r from-white to-[#D4A847] bg-clip-text text-transparent">
              Ivoire Business Club
            </span>
          </Link>
          <nav className="flex gap-6 text-sm items-center">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">Accueil</Link>
            <Link href="/articles" className="text-slate-300 hover:text-white transition-colors">Articles</Link>
            <Link href="/experts" className="text-slate-300 hover:text-white transition-colors">Experts</Link>
            <Link href="/partners" className="text-slate-300 hover:text-white transition-colors">Partenaires</Link>
            <Link href="/events" className="text-slate-300 hover:text-white transition-colors font-medium">Événements</Link>
            <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors">Tarifs</Link>
            <Link href="/auth/signin" className="text-slate-300 hover:text-white transition-colors">Connexion</Link>
          </nav>
        </div>
      </header>

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

      <Footer />
    </div>
  );
}

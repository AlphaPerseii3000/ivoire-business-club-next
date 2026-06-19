import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { EventCard } from "@/components/features/events/EventCard";
import { EmptyState } from "@/components/shared/empty-state";
import { Footer } from "@/components/landing/footer";
import { sanitizeError } from "@/lib/sanitize-log";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendrier des événements — Ivoire Business Club",
  description: "Découvrez les prochaines rencontres, conférences et événements de l'Ivoire Business Club en Côte d'Ivoire.",
  openGraph: {
    title: "Calendrier des événements — Ivoire Business Club",
    description: "Découvrez les prochaines rencontres, conférences et événements de l'Ivoire Business Club en Côte d'Ivoire.",
    type: "website",
    locale: "fr_FR",
  },
};

export default async function EventsPage() {
  const now = new Date();
  let events: {
    id: string;
    slug: string;
    title: string;
    startDate: Date;
    endDate: Date | null;
    location: string;
    imageUrl: string | null;
  }[] = [];

  try {
    events = await prisma.event.findMany({
      where: {
        status: "PUBLISHED",
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
        imageUrl: true,
      },
    });
  } catch (error) {
    console.error("Failed to fetch events:", sanitizeError(error));
    throw error;
  }

  const hasEvents = events.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090D16]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Image src="/logo-ibc.webp" alt="IBC Logo" width={32} height={32} className="h-8 w-auto" />
            <span className="hidden sm:inline bg-gradient-to-r from-white to-[#D4A847] bg-clip-text text-transparent">
              Ivoire Business Club
            </span>
          </Link>
          <nav className="flex gap-6 text-sm items-center">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">
              Accueil
            </Link>
            <Link href="/articles" className="text-slate-300 hover:text-white transition-colors">
              Articles
            </Link>
            <Link href="/events" className="text-slate-300 hover:text-white transition-colors font-medium">
              Événements
            </Link>
            <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors">
              Tarifs
            </Link>
            <Link href="/auth/signin" className="text-slate-300 hover:text-white transition-colors">
              Connexion
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-12 md:py-16">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#D4A847] bg-clip-text text-transparent sm:text-5xl">
            Calendrier des événements
          </h1>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            Rejoignez-nous lors de nos prochaines rencontres, conférences et sessions de networking en Côte d'Ivoire.
          </p>
        </div>

        {hasEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="events-grid">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
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

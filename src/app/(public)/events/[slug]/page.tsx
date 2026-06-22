import * as React from "react";
import { cache } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Footer } from "@/components/landing/footer";
import LandingMobileNav from "@/components/landing/mobile-nav";
import { sanitizeError } from "@/lib/sanitize-log";
import { EventStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

// Caches and deduplicates the database query per request
const getEventBySlug = cache(async (slug: string) => {
  return prisma.event.findFirst({
    where: {
      slug,
      status: EventStatus.PUBLISHED,
    },
  });
});

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await getEventBySlug(slug);

    if (!event) return {};

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ivoirebusinessclub.com";
    const pageUrl = `${siteUrl}/events/${slug}`;
    const imageUrl = event.imageUrl || `${siteUrl}/logo-ibc.webp`;

    return {
      title: {
        absolute: `${event.title} — Ivoire Business Club`,
      },
      description: event.description.slice(0, 160),
      openGraph: {
        title: `${event.title} — Ivoire Business Club`,
        description: event.description.slice(0, 160),
        type: "website",
        url: pageUrl,
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 600,
            alt: event.title,
          },
        ],
        locale: "fr_FR",
      },
    };
  } catch (e) {
    console.error("Failed to generate metadata:", sanitizeError(e));
    return {
      title: "Événement — Ivoire Business Club",
    };
  }
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;

  let event;
  try {
    event = await getEventBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch event details:", sanitizeError(error));
    throw error;
  }

  if (!event) {
    notFound();
  }

  const startDateFormatted = event.startDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hasEndDate = event.endDate !== null ? event.endDate !== undefined : false;
  const endDateFormatted = hasEndDate
    ? (event.endDate as Date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const hasImage = event.imageUrl ? event.imageUrl !== "" : false;
  const isCancelled = event.status === EventStatus.CANCELLED;

  if (isCancelled) {
    return (
      <div className="flex min-h-screen flex-col bg-[#090D16] text-white">
        <LandingMobileNav />
        <header className="hidden md:flex sticky top-0 z-50 border-b border-white/10 bg-[#090D16]/95 backdrop-blur">
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
              <Link href="/experts" className="text-slate-300 hover:text-white transition-colors">
                Experts
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

        <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-12">
          <Link href="/events" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors group">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Retour aux événements
          </Link>

          <div className="space-y-4 mb-8">
            <span className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/20">
              Annulé
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
              {event.title}
            </h1>
            <p className="text-slate-400">
              Cet événement a été annulé. Revenez bientôt pour découvrir les prochaines rencontres.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-white">
      {/* Mobile Navigation */}
      <LandingMobileNav />

      {/* Navigation Header */}
      <header className="hidden md:flex sticky top-0 z-50 border-b border-white/10 bg-[#090D16]/95 backdrop-blur">
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
            <Link href="/experts" className="text-slate-300 hover:text-white transition-colors">
              Experts
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
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-12">
        {/* Back Link */}
        <Link href="/events" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors group">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Retour aux événements
        </Link>

        {/* Event Metadata */}
        <div className="space-y-4 mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 pt-2 border-y border-white/5 py-3">
            <div className="flex items-center gap-2">
              <Calendar className="size-4" aria-hidden="true" />
              <span>{startDateFormatted}</span>
            </div>
            {hasEndDate ? (
              <div className="flex items-center gap-2">
                <span className="text-white/20">•</span>
                <span>Jusqu'au {endDateFormatted}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <span className="text-white/20">•</span>
              <MapPin className="size-4" aria-hidden="true" />
              <span>{event.location}</span>
            </div>
          </div>
        </div>

        {/* Banner Image */}
        {hasImage ? (
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl mb-8 border border-white/5">
            <Image
              src={event.imageUrl as string}
              alt={event.title}
              fill
              priority
              unoptimized
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
          </div>
        ) : (
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl mb-8 border border-white/5 bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center">
            <span className="text-muted-foreground/20 text-sm font-bold tracking-widest">IBC</span>
          </div>
        )}

        {/* Event Description */}
        <div className="prose prose-invert max-w-none">
          <p className="text-lg text-slate-300 leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

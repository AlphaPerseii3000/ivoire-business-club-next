import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, MapPin, Lock, Ticket, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Footer } from "@/components/landing/footer";
import LandingMobileNav from "@/components/landing/mobile-nav";
import { sanitizeError } from "@/lib/sanitize-log";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  formatEventDate,
  formatEventPricing,
  formatPrice,
  getEventTypeLabel,
  getPriceForTier,
  getRemainingSpots,
  isPrivateEventForVisitor,
  normalizePricing,
} from "@/lib/event-utils";
import { Button } from "@/components/ui/button";
import { EventStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export interface EventDetailWithRegistrations {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  eventType: string;
  visibility: string;
  location: string | null;
  onlineUrl: string | null;
  coverImagePath: string | null;
  maxCapacity: number | null;
  pricing: unknown;
  status: string;
  registrations: Array<{ status: string }>;
}

async function getEventBySlug(slug: string): Promise<EventDetailWithRegistrations | null> {
  return prisma.event.findFirst({
    where: {
      slug,
      status: EventStatus.PUBLISHED,
    },
    include: {
      registrations: {
        where: {
          status: "REGISTERED",
        },
        select: {
          status: true,
        },
      },
    },
  }) as Promise<EventDetailWithRegistrations | null>;
}

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await getEventBySlug(slug);

    if (!event) return {};

    const isPrivateVisitor = isPrivateEventForVisitor(event.visibility, false);
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.ivoire-business-club.com";
    const pageUrl = `${siteUrl}/events/${slug}`;
    const imageUrl = event.coverImagePath
      ? `${siteUrl}/api/media/events/${event.id}/cover`
      : `${siteUrl}/logo-ibc.webp`;

    const title = `${event.title} — Ivoire Business Club`;
    const description = isPrivateVisitor
      ? "Événement réservé aux membres IBC. Devenez membre pour découvrir tous les détails."
      : event.description.slice(0, 160);

    return {
      title: {
        absolute: title,
      },
      description,
      openGraph: {
        title,
        description,
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
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.id);
  const userTier = (session?.user as Record<string, unknown>)?.tier as string | null ?? null;

  let event: EventDetailWithRegistrations | null = null;
  try {
    event = await getEventBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch event details:", sanitizeError(error));
    throw error;
  }

  if (!event) {
    notFound();
  }

  const isCancelled = event.status === EventStatus.CANCELLED;
  const isPrivateVisitor = isPrivateEventForVisitor(event.visibility, isAuthenticated);
  const eventTypeLabel = getEventTypeLabel(event.eventType);
  const pricing = normalizePricing(event.pricing);
  const { visitor, memberMin, isFree } = formatEventPricing(pricing);
  const userPrice = userTier ? getPriceForTier(pricing, userTier) : null;
  const showUserPrice = isAuthenticated && userPrice !== null;
  const remainingSpots = getRemainingSpots(event.maxCapacity, event.registrations);

  const startDateFormatted = formatEventDate(event.startDate);
  const hasEndDate = event.endDate !== null;
  const endDateFormatted = hasEndDate ? formatEventDate(event.endDate as Date) : "";

  const coverUrl = event.coverImagePath ? `/api/media/events/${event.id}/cover` : null;

  const renderNavigationHeader = () => (
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
          <Link href="/events" className="text-slate-300 hover:text-white transition-colors font-medium">Événements</Link>
          <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors">Tarifs</Link>
          <Link href="/auth/signin" className="text-slate-300 hover:text-white transition-colors">Connexion</Link>
        </nav>
      </div>
    </header>
  );

  if (isCancelled) {
    return (
      <div className="flex min-h-screen flex-col bg-[#090D16] text-white">
        <LandingMobileNav />
        {renderNavigationHeader()}

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
      <LandingMobileNav />
      {renderNavigationHeader()}

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-12">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors group">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Retour aux événements
        </Link>

        <div className="space-y-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-400 ring-1 ring-inset ring-teal-400/20">
              {eventTypeLabel}
            </span>
            {isPrivateVisitor ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-400/20">
                <Lock className="size-3.5" aria-hidden="true" />
                Privé — Membres uniquement
              </span>
            ) : null}
          </div>

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
                <span>Jusqu&rsquo;au {endDateFormatted}</span>
              </div>
            ) : null}
            {!isPrivateVisitor ? (
              <div className="flex items-center gap-2">
                <span className="text-white/20">•</span>
                <MapPin className="size-4" aria-hidden="true" />
                <span>{event.eventType === "ONLINE" ? (event.onlineUrl ? "Visio" : "En ligne") : (event.location ? event.location : "Lieu à confirmer")}</span>
              </div>
            ) : null}
          </div>
        </div>

        {coverUrl ? (
          <div className={`relative aspect-[21/9] w-full overflow-hidden rounded-2xl mb-8 border border-white/5 ${isPrivateVisitor ? "blur-md select-none" : ""}`}>
            <Image
              src={coverUrl}
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

        {isPrivateVisitor ? (
          <div className="space-y-6">
            <div className="prose prose-invert max-w-none">
              <p className="text-lg text-slate-300 leading-relaxed whitespace-pre-line blur-md select-none">
                {event.description}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
              <p className="mb-4 text-amber-200">
                Ce contenu est réservé aux membres de l&rsquo;Ivoire Business Club.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-[#D4A847] px-4 py-2 text-sm font-semibold text-black hover:bg-[#D4A847]/90"
              >
                <Lock className="size-4" aria-hidden="true" />
                Devenir membre pour débloquer
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="prose prose-invert max-w-none">
              <p className="text-lg text-slate-300 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                  <Users className="size-4" aria-hidden="true" />
                  <span>Places restantes</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {remainingSpots === null
                    ? "Places illimitées"
                    : remainingSpots <= 0
                      ? "Complet"
                      : `${remainingSpots} places restantes`}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                  <Ticket className="size-4" aria-hidden="true" />
                  <span>Visiteur</span>
                </div>
                <p className="text-lg font-semibold text-white">{isFree ? "Gratuit" : formatPrice(visitor)}</p>
              </div>

              <div className="rounded-xl border border-[#D4A847]/30 bg-[#D4A847]/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-[#D4A847]">
                  <Ticket className="size-4" aria-hidden="true" />
                  <span>Membres</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {isFree ? "Gratuit" : memberMin !== null ? `À partir de ${formatPrice(memberMin)}` : "Gratuit"}
                </p>
              </div>
            </div>

            {showUserPrice ? (
              <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4">
                <p className="text-sm text-teal-300">
                  Votre tarif ({getTierLabel(userTier)}) :
                  <span className="ml-1 text-lg font-semibold text-white">
                    {formatPrice(userPrice)}
                  </span>
                </p>
              </div>
            ) : null}

            <div className="flex items-center gap-4">
              <Button className="bg-[#D4A847] text-black hover:bg-[#D4A847]/90">
                S&rsquo;inscrire
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function getTierLabel(tier: string | null): string {
  if (tier === "AFFRANCHI") return "Affranchis";
  if (tier === "GRAND_FRERE") return "Grands Frères";
  if (tier === "BOSS") return "Boss";
  return tier ?? "Membre";
}

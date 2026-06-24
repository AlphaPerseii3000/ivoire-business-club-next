import Link from 'next/link';
import type { Metadata } from 'next';

import { Hero } from '@/components/landing/hero';
import { Mission } from '@/components/landing/mission';
import { HowItWorks } from '@/components/landing/how-it-works';

import { Pricing } from '@/components/landing/pricing';
import { OpportunityTeasers } from '@/components/landing/opportunity-teasers';
import { LeadMagnet } from '@/components/landing/lead-magnet';
import { Footer } from '@/components/landing/footer';
import { prisma } from '@/lib/prisma';
import { SuccessWall } from '@/components/landing/success-wall';
import { ScrollVideoPlayer } from '@/components/ui/scroll-video-player';
import { LatestArticles } from '@/components/landing/latest-articles';
import { NextEventCard, type NextEventCardEvent } from '@/components/features/events/NextEventCard';
import { EventPopup } from '@/components/features/events/EventPopup';
import { getNextPublishedEvent } from '@/lib/event-utils';
import LandingMobileNav from '@/components/landing/mobile-nav';

// Le rendu dynamique évite d'accéder à la base de données lors du build statique.
export const dynamic = 'force-dynamic';

const homeTitle = 'Ivoire Business Club | Club business à Abidjan \u0026 en Europe';
const homeDescription =
  'Rejoins le club business IBC à Abidjan : opportunités d\u2019investissement, networking et deals exclusifs pour entrepreneurs en Côte d\u2019Ivoire.';

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: 'https://www.ivoire-business-club.com',
    siteName: 'Ivoire Business Club',
    images: [
      {
        url: '/logo-ibc.webp',
        width: 800,
        height: 600,
        alt: 'Logo Ivoire Business Club',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
};

export default async function HomePage() {
  let teasers: {
    id: string;
    title: string;
    category: string | null;
    location: string | null;
  }[] = [];
  let latestArticles: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    category: string;
    imageUrl: string | null;
    publishedAt: Date | null;
  }[] = [];
  let nextEvent: NextEventCardEvent | null = null;

  try {
    const opportunities = await prisma.opportunity.findMany({
      where: { verificationStatus: 'VERIFIED' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        category: true,
        author: { select: { location: true } },
      },
    });

    teasers = opportunities.map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title,
      category: opportunity.category,
      location: opportunity.author.location,
    }));
  } catch (err) {
    console.error('Error fetching opportunities for landing page:', err);
    // Graceful fallback if database is not reachable at build time
  }

  try {
    latestArticles = await prisma.article.findMany({
      where: {
        published: true,
        visibility: 'PUBLIC',
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        imageUrl: true,
        publishedAt: true,
      },
    });
  } catch (err) {
    console.error('Error fetching articles for landing page:', err);
  }

  try {
    const fetchedEvent = await getNextPublishedEvent();
    if (fetchedEvent) {
      nextEvent = {
        id: fetchedEvent.id,
        slug: fetchedEvent.slug,
        title: fetchedEvent.title,
        startDate: fetchedEvent.startDate,
        endDate: fetchedEvent.endDate,
        location: fetchedEvent.location,
        imageUrl: fetchedEvent.imageUrl,
      };
    }
  } catch (err) {
    console.error('Error fetching next event for landing page:', err);
  }

  const showEventPopup = process.env.NEXT_PUBLIC_SHOW_EVENT_POPUP === 'true';
  const hasNextEvent = nextEvent !== null;

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-white pb-20 md:pb-0">
      <LandingMobileNav />

      <header className="hidden md:flex sticky top-0 z-40 border-b border-white/10 bg-[#090D16]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2"
          >
            <img src="/logo-ibc.webp" alt="IBC Logo" className="h-8 w-auto" />
            <span className="hidden sm:inline bg-gradient-to-r from-white to-[#D4A847] bg-clip-text text-transparent">
              Ivoire Business Club
            </span>
          </Link>
          <nav className="flex gap-6 text-sm items-center">
            <a href="#mission" className="text-slate-300 hover:text-white transition-colors">
              Mission
            </a>
            <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">
              Tarifs
            </a>
            <Link href="/articles" className="text-slate-300 hover:text-white transition-colors">
              Articles
            </Link>
            <Link href="/experts" className="text-slate-300 hover:text-white transition-colors">
              Experts
            </Link>
            <Link href="/partners" className="text-slate-300 hover:text-white transition-colors">
              Partenaires
            </Link>
            <Link href="/events" className="text-slate-300 hover:text-white transition-colors font-medium">
              Événements
            </Link>
            <Link
              href="/auth/signin"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Connexion
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Hero />
        <Mission />
        <HowItWorks />

        {/* Scroll Controlled Video Experience */}
        <ScrollVideoPlayer
          videoUrl="/animated-network-lines-abidjan.mp4"
          fallbackImageUrl="/hero-background-ibc-next.webp"
        />

        <SuccessWall />
        {hasNextEvent ? <NextEventCard event={nextEvent} /> : null}
        <OpportunityTeasers opportunities={teasers} />
        <LatestArticles articles={latestArticles.map((a) => ({ ...a, publishedAt: a.publishedAt?.toISOString() ?? null }))} />
        <Pricing />
        <LeadMagnet />

        {/* Internal SEO links section */}
        <section className="border-t border-white/10 bg-[#090D16] py-16 md:py-20" data-testid="seo-internal-links">
          <div className="mx-auto max-w-7xl px-4">
            <div className="max-w-3xl mb-10">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Découvrir IBC
              </h2>
              <p className="mt-4 text-base text-slate-400 leading-relaxed">
                Explorez nos ressources pour investir et entreprendre en Côte d&apos;Ivoire.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Link
                href="/business-abidjan"
                className="group block rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-[#D4A847]/30 hover:bg-white/[0.07]"
              >
                <h3 className="text-lg font-semibold text-white group-hover:text-[#D4A847] transition-colors">
                  Business à Abidjan — opportunités et networking
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Opportunités business à Abidjan, conseils pour investir et networking avec l&apos;Ivoire Business Club.
                </p>
              </Link>
              <Link
                href="/actualites"
                className="group block rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-[#D4A847]/30 hover:bg-white/[0.07]"
              >
                <h3 className="text-lg font-semibold text-white group-hover:text-[#D4A847] transition-colors">
                  Actualités Ivoire Business Club
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Articles et événements récents de l&apos;Ivoire Business Club pour rester informé et développer votre business.
                </p>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {hasNextEvent ? <EventPopup event={nextEvent} enabled={showEventPopup} /> : null}

      <Footer />

      {/* Sticky Bottom CTA for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#090D16]/90 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <Link
          href="/auth/signup"
          className="flex min-h-11 w-full items-center justify-center rounded-md bg-[#D4A847] text-sm font-semibold text-black hover:bg-[#D4A847]/90 transition-colors"
        >
          Rejoins le club
        </Link>
      </div>
    </div>
  );
}

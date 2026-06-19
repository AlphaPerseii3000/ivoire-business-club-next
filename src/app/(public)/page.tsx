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

// Dynamic rendering avoids requiring database access during build.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ivoire Business Club — Bâtir son futur en Afrique',
  description:
    'Découvrez la mission de l\'IBC, accédez à des deals d\'élite en Côte d\'Ivoire, et comparez nos offres de membre.',
  openGraph: {
    title: 'Ivoire Business Club — Bâtir son futur en Afrique',
    description:
      'Découvrez la mission de l\'IBC, accédez à des deals d\'élite en Côte d\'Ivoire, et comparez nos offres de membre.',
    url: 'https://ivoirebusinessclub.com',
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

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-white pb-20 md:pb-0">

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090D16]/95 backdrop-blur">
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
            <Link href="/events" className="text-slate-300 hover:text-white transition-colors font-medium">
              Événements
            </Link>
            <a
              href="/auth/signin"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Connexion
            </a>
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
        <OpportunityTeasers opportunities={teasers} />
        <LatestArticles articles={latestArticles.map((a) => ({ ...a, publishedAt: a.publishedAt?.toISOString() ?? null }))} />
        <Pricing />
        <LeadMagnet />
      </main>

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

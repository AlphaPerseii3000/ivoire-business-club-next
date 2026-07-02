import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/sanitize-log";
import { Footer } from "@/components/landing/footer";
import LandingMobileNav from "@/components/landing/mobile-nav";
import { ArticleCard } from "@/components/features/articles/ArticleCard";
import { EventCard } from "@/components/features/events/EventCard";
import { ArticleVisibility } from "@/generated/prisma/client";
import { EmptyState } from "@/components/shared/empty-state";

export const revalidate = 3600;

const title = "Actualités, Articles & Événements | Ivoire Business Club";
const description =
  "Retrouvez les actualités de l'Ivoire Business Club : articles, analyses et événements business pour investir et entreprendre en Côte d'Ivoire.";

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

export default async function ActualitesPage() {
  let latestArticles: {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    imageUrl: string | null;
    publishedAt: Date | null;
    category: string;
  }[] = [];

  try {
    latestArticles = await prisma.article.findMany({
      where: {
        published: true,
        visibility: ArticleVisibility.PUBLIC,
        publishedAt: { lte: new Date() },
      },
      orderBy: { publishedAt: "desc" },
      take: 6,
      select: { id: true, slug: true, title: true, excerpt: true, imageUrl: true, publishedAt: true, category: true },
    });
  } catch (error) {
    console.error("Failed to fetch latest articles for /actualites:", sanitizeError(error));
  }

  let upcomingEvents: {
    id: string;
    slug: string;
    title: string;
    startDate: Date;
    endDate: Date | null;
    location: string;
    imageUrl: string | null;
  }[] = [];

  try {
    upcomingEvents = await prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: "asc" },
      take: 3,
      select: { id: true, slug: true, title: true, startDate: true, endDate: true, location: true, imageUrl: true },
    });
  } catch (error) {
    console.error("Failed to fetch upcoming events for /actualites:", sanitizeError(error));
  }

  const hasArticles = latestArticles.length > 0;
  const hasEvents = upcomingEvents.length > 0;

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
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">
              Accueil
            </Link>
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
            <Link href="/opportunities" className="text-slate-300 hover:text-white transition-colors font-medium">
              Opportunités
            </Link>
            <Link href="/auth/signin" className="text-slate-300 hover:text-white transition-colors">
              Connexion
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 pt-24 py-12 md:py-16">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#D4A847] bg-clip-text text-transparent sm:text-5xl">
            Actualités
          </h1>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            Suivez l&apos;actualité de l&apos;Ivoire Business Club : articles d&apos;analyse, guides pratiques et prochaines rencontres networking pour booster votre business en Côte d&apos;Ivoire.
          </p>
        </div>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Derniers articles</h2>
          {hasArticles ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="actualites-articles-grid">
              {latestArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={{
                    ...article,
                    publishedAt: article.publishedAt?.toISOString() ?? null,
                    visibility: ArticleVisibility.PUBLIC,
                  }}
                  hasAccess
                />
              ))}
            </div>
          ) : null}
          {!hasArticles ? (
            <EmptyState
              title="Aucun article disponible"
              description="Revenez bientôt pour découvrir nos nouvelles publications."
            />
          ) : null}
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Prochains événements</h2>
          {hasEvents ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="actualites-events-grid">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : null}
          {!hasEvents ? (
            <EmptyState
              title="Aucun événement à venir"
              description="Consultez notre calendrier pour ne rien manquer."
            />
          ) : null}
        </section>
      </main>

      <Footer />
    </div>
  );
}

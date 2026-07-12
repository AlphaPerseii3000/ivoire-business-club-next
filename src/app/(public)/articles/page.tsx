import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription-access";
import { getAccessibleArticleVisibilities } from "@/lib/article-visibility";
import { ArticleCard } from "@/components/features/articles/ArticleCard";
import { ArticleVisibility, Prisma, Article, Tier } from "@/generated/prisma/client";
import { sanitizeError } from "@/lib/sanitize-log";

const title = "Articles, Guides & Conseils | Ivoire Business Club";
const description =
  "Découvrez articles, guides et témoignages exclusifs de l'Ivoire Business Club pour investir, entreprendre et réussir vos projets en Côte d'Ivoire.";

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

export const dynamic = "force-dynamic";

interface ArticlesPageProps {
  searchParams: Promise<{ category?: string }>;
}

interface CustomSessionUser {
  id?: string;
  tier?: Tier | null;
  role?: string;
}

const CATEGORIES = [
  { id: "Tous", label: "Tous" },
  { id: "conseil", label: "Conseils" },
  { id: "guide", label: "Guides" },
  { id: "temoignage", label: "Témoignages" },
  { id: "actu", label: "Actualités" },
];

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const resolvedSearchParams = await searchParams;
  const activeCategory = resolvedSearchParams.category ?? "Tous";

  // 1. Get current session and roles
  const session = await auth();
  const isLoggedIn = !!session?.user;

  if (isLoggedIn) {
    const sessionUser = session.user as unknown as { emailVerified?: boolean; onboardingCompleted?: boolean };
    if (!sessionUser.emailVerified || !sessionUser.onboardingCompleted) {
      redirect("/dashboard?incomplete=1");
    }
  }

  const user = session?.user as CustomSessionUser | undefined;
  const userId = user?.id;
  const userTier = user?.tier ?? null;
  const isAdmin = user?.role === "ADMIN";

  // 2. Validate subscription status
  const hasActiveSub = userId ? await hasActiveSubscription(userId) : false;

  // 3. Build Prisma query where clause
  const whereClause: Prisma.ArticleWhereInput = {
    published: true,
    publishedAt: {
      lte: new Date(),
    },
  };

  // Filter by category if specified
  if (activeCategory && activeCategory !== "Tous") {
    const searchCat = decodeURIComponent(activeCategory).toLowerCase().trim();
    if (searchCat === "temoignage" || searchCat === "témoignage") {
      whereClause.category = {
        in: ["temoignage", "témoignage", "Temoignage", "Témoignage", "TEMOIGNAGE", "TÉMOIGNAGE"],
      };
    } else {
      const capitalized = searchCat.charAt(0).toUpperCase() + searchCat.slice(1);
      whereClause.category = {
        in: [searchCat, capitalized, searchCat.toUpperCase()],
      };
    }
  }

  // Server-side visibility filtering rule:
  // - Anonymous: can ONLY fetch PUBLIC articles
  // - Authenticated: fetch all published articles, but check hasAccess individually
  if (!isLoggedIn) {
    whereClause.visibility = ArticleVisibility.PUBLIC;
  }

  // 4. Fetch articles from Database
  let articles: Article[] = [];
  try {
    articles = await prisma.article.findMany({
      where: whereClause,
      orderBy: {
        publishedAt: "desc",
      },
    });
  } catch (error) {
    console.error("Failed to fetch articles:", sanitizeError(error));
    throw error;
  }

  // 5. Calculate accessible article visibilities for the logged-in user
  const allowedVisibilities = getAccessibleArticleVisibilities(userTier, hasActiveSub);

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-white">
      {/* Mobile Navigation */}
      
      {/* Navigation Header */}
      
      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 pt-24 py-12 md:py-16">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#D4A847] bg-clip-text text-transparent sm:text-5xl">
            Articles, Guides & Conseils
          </h1>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            Parcourez nos analyses, guides d&apos;investissement et témoignages exclusifs pour réussir votre implantation ou vos investissements en Côte d&apos;Ivoire.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-10 border-b border-white/10 pb-6" aria-label="Filtrer par catégorie">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <Link
                key={cat.id}
                href={cat.id === "Tous" ? "/articles" : `/articles?category=${cat.id}`}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-[#D4A847] text-black shadow-md shadow-[#D4A847]/10"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>

        {/* Articles Grid */}
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="articles-grid">
            {articles.map((article) => {
              // Calculate hasAccess for each article
              const hasAccess =
                isAdmin ||
                article.visibility === ArticleVisibility.PUBLIC ||
                (hasActiveSub && allowedVisibilities.includes(article.visibility));

              return <ArticleCard key={article.id} article={article} hasAccess={hasAccess} />;
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/2 rounded-2xl border border-white/5">
            <p className="text-slate-400 text-lg">Aucun article trouvé dans cette catégorie.</p>
            <Link href="/articles" className="mt-4 inline-block text-sm text-[#D4A847] hover:underline">
              Voir tous les articles
            </Link>
          </div>
        )}
      </main>

          </div>
  );
}

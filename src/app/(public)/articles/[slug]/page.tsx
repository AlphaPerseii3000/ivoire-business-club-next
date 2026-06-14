import * as React from "react";
import { cache } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Lock, ArrowLeft, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription-access";
import { getAccessibleArticleVisibilities } from "@/lib/article-visibility";
import { ArticleContent } from "@/components/features/articles/ArticleContent";
import { ArticleReactions } from "@/components/features/articles/ArticleReactions";
import { Footer } from "@/components/landing/footer";
import { buttonVariants } from "@/components/ui/button";
import { getTierBadgeConfig } from "@/lib/tier-config";
import { cn } from "@/lib/utils";
import { ArticleVisibility, Tier } from "@/generated/prisma/client";
import { sanitizeError } from "@/lib/sanitize-log";

export const dynamic = "force-dynamic";

interface ArticleDetailPageProps {
  params: Promise<{ slug: string }>;
}

interface CustomSessionUser {
  id?: string;
  tier?: Tier | null;
  role?: string;
}

// Caches and deduplicates the database query per request
const getArticleBySlug = cache(async (slug: string) => {
  return prisma.article.findFirst({
    where: { slug, published: true },
    include: {
      author: {
        select: {
          name: true,
        },
      },
    },
  });
});

export async function generateMetadata({ params }: ArticleDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getArticleBySlug(slug);

    if (!article) return {};

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ivoirebusinessclub.com";
    const pageUrl = `${siteUrl}/articles/${slug}`;
    const imageUrl = `${siteUrl}/logo-ibc.webp`;

    return {
      title: {
        absolute: `${article.title} — Ivoire Business Club`,
      },
      description: article.excerpt,
      openGraph: {
        title: `${article.title} — Ivoire Business Club`,
        description: article.excerpt,
        type: "article",
        url: pageUrl,
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 600,
            alt: article.title,
          },
        ],
        locale: "fr_FR",
      },
    };
  } catch (e) {
    console.error("Failed to generate metadata:", sanitizeError(e));
    return {
      title: "Article — Ivoire Business Club",
    };
  }
}

export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  const { slug } = await params;

  // 1. Fetch the article with author details (guarded against db failures)
  let article;
  try {
    article = await getArticleBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch article details:", sanitizeError(error));
    throw error;
  }

  if (!article) {
    notFound();
  }

  // 2. Auth & permissions checks
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const user = session?.user as CustomSessionUser | undefined;
  const userId = user?.id;
  const userTier = user?.tier ?? null;
  const isAdmin = user?.role === "ADMIN";

  const hasActiveSub = userId ? await hasActiveSubscription(userId) : false;
  const allowedVisibilities = getAccessibleArticleVisibilities(userTier, hasActiveSub);

  const hasAccess =
    isAdmin ||
    article.visibility === ArticleVisibility.PUBLIC ||
    (hasActiveSub && allowedVisibilities.includes(article.visibility));

  const rawDate = article.publishedAt ?? article.createdAt;
  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const badgeConfig = getTierBadgeConfig(article.visibility);

  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://ivoirebusinessclub.com").replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.excerpt,
    "datePublished": article.publishedAt && !isNaN(new Date(article.publishedAt).getTime())
      ? new Date(article.publishedAt).toISOString()
      : new Date(article.createdAt).toISOString(),
    "dateModified": article.updatedAt && !isNaN(new Date(article.updatedAt).getTime())
      ? new Date(article.updatedAt).toISOString()
      : new Date(article.createdAt).toISOString(),
    "author": {
      "@type": "Person",
      "name": article.author?.name || "L'Équipe IBC",
    },
    "publisher": {
      "@type": "Organization",
      "name": "Ivoire Business Club",
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo-ibc.webp`
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090D16]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Image src="/logo-ibc.webp" alt="IBC Logo" width={32} height={32} className="h-8 w-auto" />
            <span className="hidden sm:inline bg-gradient-to-r from-white to-[#D4A847] bg-clip-text text-transparent">
              Ivoire Business Club
            </span>
            <span className="sm:hidden text-white">IBC</span>
          </Link>
          <nav className="flex gap-6 text-sm items-center">
            <Link href="/articles" className="text-slate-300 hover:text-white transition-colors">
              Articles
            </Link>
            <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors">
              Tarifs
            </Link>
            {isLoggedIn ? (
              <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors font-medium">
                Tableau de bord
              </Link>
            ) : (
              <Link href="/auth/signin" className="text-slate-300 hover:text-white transition-colors">
                Connexion
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-12">
        {/* Back Link */}
        <Link href="/articles" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors group">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Retour au catalogue
        </Link>

        {/* Article Metadata */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded">
              {article.category}
            </span>
            <span className={cn("px-2.5 py-0.5 text-xs font-medium rounded-full border", badgeConfig.className)}>
              {!hasAccess ? <Lock className="size-3 mr-1.5 inline-block" /> : null}
              {badgeConfig.label}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-slate-400 pt-2 border-y border-white/5 py-3">
            <span>Par <strong className="text-white">{article.author?.name || "L'Équipe IBC"}</strong></span>
            <span className="text-white/20">•</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Access Logic Render */}
        {hasAccess ? (
          <div className="bg-transparent rounded-xl space-y-8">
            <ArticleContent content={article.content} />
            <div className="border-t border-white/10 pt-8 mt-8">
              <ArticleReactions articleId={article.id} isLoggedIn={isLoggedIn} />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Excerpt still shown */}
            <p className="text-lg text-slate-300 leading-relaxed italic border-l-4 border-slate-500 pl-4 py-1">
              {article.excerpt}
            </p>

            {/* Gate Panel (Encart Premium) */}
            <div data-testid="gate-panel" className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-b from-[#0e1628] to-[#070b12] p-8 text-center shadow-xl shadow-teal-500/5">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-24 bg-[#D4A847] rounded-b-full" />
              
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal-500/10 text-[#D4A847] mb-6">
                <Lock className="size-6" />
              </div>

              <h3 className="text-2xl font-bold tracking-tight text-white mb-3">
                Cet article est réservé aux membres Premium
              </h3>
              
              <p className="text-slate-300 max-w-md mx-auto mb-6 text-sm leading-relaxed">
                Le contenu exclusif de l&apos;Ivoire Business Club, y compris cette publication au niveau{" "}
                <span className="font-semibold text-teal-400">{badgeConfig.label}</span>, est réservé à nos membres actifs abonnés.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/pricing"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "cursor-pointer w-full sm:w-auto bg-[#D4A847] text-black hover:bg-[#D4A847]/90 font-semibold"
                  )}
                >
                  Abonnez-vous pour lire l&apos;article complet
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
                
                {isLoggedIn ? (
                  <Link
                    href="/dashboard/subscription"
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "cursor-pointer w-full sm:w-auto border-white/10 text-slate-300 hover:text-white"
                    )}
                  >
                    Vérifier mon abonnement
                  </Link>
                ) : (
                  <Link
                    href="/auth/signin"
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "cursor-pointer w-full sm:w-auto border-white/10 text-slate-300 hover:text-white"
                    )}
                  >
                    Se connecter
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { BlurReveal } from '@/components/ui/blur-reveal';

type ArticleTeaser = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  publishedAt?: Date | string | null;
};

type LatestArticlesProps = {
  articles: ArticleTeaser[];
};

export function LatestArticles({ articles }: LatestArticlesProps) {
  return (
    <section id="actualites" className="bg-[#090D16] py-24 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <BlurReveal>
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="text-[#D4A847] text-sm font-semibold uppercase tracking-wider">
              Actualités & Conseils
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Derniers articles</h2>
            <p className="mt-4 text-slate-400">
              Restez informé des dernières tendances du marché et découvrez des conseils d&apos;experts pour réussir en Côte d&apos;Ivoire.
            </p>
          </div>
        </BlurReveal>

        {articles && articles.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-3">
            {articles.map((article, i) => {
              const formattedDate = article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '';

              return (
                <BlurReveal key={article.id} delay={i * 120}>
                  <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#D4A847]/30 hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-[#D4A847]/5">
                    {/* Decorative radial gradient glow */}
                    <div className="absolute -right-20 -top-20 -z-10 size-40 rounded-full bg-gradient-to-br from-[#D4A847]/5 to-[#00b4d8]/5 blur-2xl transition-all duration-500 group-hover:scale-150" />

                    <div>
                      {/* Category Badge */}
                      <span className="inline-block text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded mb-4">
                        {article.category}
                      </span>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-white transition-colors group-hover:text-[#D4A847] line-clamp-2 mb-3">
                        <Link href={`/articles/${article.slug}`}>
                          {article.title}
                        </Link>
                      </h3>

                      {/* Excerpt */}
                      <p className="text-sm text-slate-400 line-clamp-3 mb-6">
                        {article.excerpt}
                      </p>
                    </div>

                    {/* Date and Action Link */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs">
                      <span className="text-slate-500">{formattedDate}</span>
                      <Link
                        href={`/articles/${article.slug}`}
                        className="font-medium text-[#D4A847] hover:underline flex items-center gap-1"
                      >
                        Lire l&apos;article
                        <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                      </Link>
                    </div>
                  </div>
                </BlurReveal>
              );
            })}
          </div>
        ) : (
          <BlurReveal>
            <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-white/10 bg-[#0F172A] p-8 text-center text-slate-400">
              Aucun article publié pour le moment.
            </div>
          </BlurReveal>
        )}

        <BlurReveal delay={400}>
          <div className="mt-12 text-center">
            <Link
              href="/articles"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#D4A847] px-6 py-2 text-sm font-semibold text-[#D4A847] hover:bg-[#D4A847]/10 transition-all duration-300"
            >
              Voir tous les articles
            </Link>
          </div>
        </BlurReveal>
      </div>
    </section>
  );
}

export default LatestArticles;

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getTierBadgeConfig } from "@/lib/tier-config";
import { cn } from "@/lib/utils";
import { ArticleVisibility } from "@/generated/prisma/client";

export interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    category: string;
    imageUrl?: string | null;
    visibility: ArticleVisibility;
    publishedAt?: Date | string | null;
    createdAt?: Date | string | null;
  };
  hasAccess: boolean;
}

export function ArticleCard({ article, hasAccess }: ArticleCardProps) {
  const badgeConfig = getTierBadgeConfig(article.visibility);
  const rawDate = article.publishedAt ?? article.createdAt;
  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <Card className="group h-full flex flex-col justify-between overflow-hidden border border-border/40 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/5 hover:border-teal-500/20">
      <div>
        {article.imageUrl && article.imageUrl !== "" ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border/10">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border/10 bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center">
            <span className="text-muted-foreground/20 text-xs font-bold tracking-widest">IBC</span>
          </div>
        )}

        <CardHeader className="gap-2 p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded">
              {article.category}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge className={cn("px-2 py-0.5 text-xs font-medium rounded-full", badgeConfig.className)}>
                {!hasAccess ? <Lock className="size-3 mr-1 inline-block" /> : null}
                {badgeConfig.label}
              </Badge>
            </div>
          </div>
          <CardTitle className="text-lg font-bold tracking-tight text-foreground mt-2 line-clamp-2">
            <Link href={`/articles/${article.slug}`} className="hover:text-teal-500 transition-colors">
              {article.title}
            </Link>
          </CardTitle>
        </CardHeader>

        <CardContent className="px-5 pb-5">
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {article.excerpt}
          </p>
        </CardContent>
      </div>

      <CardFooter className="flex items-center justify-between p-5 pt-4 border-t border-border/20 bg-muted/20">
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
        {hasAccess ? (
          <Link
            href={`/articles/${article.slug}`}
            className={cn(buttonVariants({ size: "sm" }), "cursor-pointer group")}
          >
            Lire l'article
            <ArrowRight className="size-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <Link
            href="/pricing"
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "cursor-pointer border-teal-500/30 text-teal-600 hover:bg-teal-500/5 dark:text-teal-400 group"
            )}
          >
            Abonnez-vous
            <Lock className="size-3.5 ml-1.5" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

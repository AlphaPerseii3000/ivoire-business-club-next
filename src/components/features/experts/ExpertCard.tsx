import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock, ArrowRight, User } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getTierBadgeConfig } from "@/lib/tier-config";
import { cn } from "@/lib/utils";
import type { Tier } from "@/generated/prisma/client";

export interface ExpertCardProps {
  expert: {
    id: string;
    name: string;
    slug: string;
    title: string;
    photoUrl?: string | null;
    specialties?: string | null;
    requiredTier: Tier;
  };
  hasAccess: boolean;
}

export function ExpertCard({ expert, hasAccess }: ExpertCardProps) {
  const badgeConfig = getTierBadgeConfig(expert.requiredTier);

  // Split and trim specialties
  const specialtiesList = expert.specialties
    ? expert.specialties
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  // Generate initials for the fallback avatar
  const initials = expert.name
    ? expert.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return (
    <Card className="group h-full flex flex-col justify-between overflow-hidden border border-border/40 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/5 hover:border-teal-500/20">
      <div>
        {expert.photoUrl && expert.photoUrl !== "" ? (
          <div className="relative aspect-[1/1] w-full overflow-hidden border-b border-border/10">
            <Image
              src={expert.photoUrl}
              alt={expert.name}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="relative aspect-[1/1] w-full overflow-hidden border-b border-border/10 bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex flex-col items-center justify-center">
            <div className="flex items-center justify-center size-20 rounded-full bg-[#D4A847]/10 text-[#D4A847] border border-[#D4A847]/20">
              {initials ? (
                <span className="text-2xl font-bold tracking-wider">{initials}</span>
              ) : (
                <User className="size-10" />
              )}
            </div>
          </div>
        )}

        <CardHeader className="gap-1 p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <Badge className={cn("px-2.5 py-0.5 text-xs font-semibold rounded-full border", badgeConfig.className)}>
              {!hasAccess ? <Lock className="size-3 mr-1 inline-block" data-testid="lock-icon" /> : null}
              {badgeConfig.label}
            </Badge>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground line-clamp-1">
            <Link href={`/experts/${expert.slug}`} className="hover:text-teal-500 transition-colors">
              {expert.name}
            </Link>
          </CardTitle>
          <p className="text-sm font-medium text-teal-600 dark:text-teal-400 mt-0.5 line-clamp-1">
            {expert.title}
          </p>
        </CardHeader>

        <CardContent className="px-5 pb-5 pt-0">
          {specialtiesList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {specialtiesList.map((spec, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white/5 text-slate-300 rounded"
                >
                  {spec}
                </span>
              ))}
            </div>
          ) : null}
        </CardContent>
      </div>

      <CardFooter className="flex items-center justify-end p-5 pt-4 border-t border-border/20 bg-muted/20">
        {hasAccess ? (
          <Link
            href={`/experts/${expert.slug}`}
            className={cn(buttonVariants({ size: "sm" }), "cursor-pointer group")}
          >
            Voir le profil
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
            S&apos;abonner
            <Lock className="size-3.5 ml-1.5" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

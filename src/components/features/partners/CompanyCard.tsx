import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Building2 } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CompanyCardProps {
  company: {
    id: string;
    name: string;
    slug: string;
    description: string;
    logoUrl?: string | null;
    sectors?: string | null;
  };
}

export function CompanyCard({ company }: CompanyCardProps) {
  // Diviser et nettoyer les secteurs
  const sectorsList = company.sectors
    ? company.sectors
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  // Générer les initiales pour le repli
  const initials = company.name
    ? company.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return (
    <Card className="relative group h-full flex flex-col justify-between overflow-hidden border border-border/40 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/5 hover:border-teal-500/20">
      <div>
        {company.logoUrl && company.logoUrl !== "" ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border/10 bg-white/5 flex items-center justify-center p-4">
            <Image
              src={company.logoUrl}
              alt={company.name}
              fill
              unoptimized
              className="object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border/10 bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex flex-col items-center justify-center">
            <div className="flex items-center justify-center size-16 rounded-full bg-[#D4A847]/10 text-[#D4A847] border border-[#D4A847]/20">
              {initials ? (
                <span className="text-xl font-bold tracking-wider">{initials}</span>
              ) : (
                <Building2 className="size-8" />
              )}
            </div>
          </div>
        )}

        <CardHeader className="gap-1 p-5">
          <CardTitle className="text-xl font-bold tracking-tight text-foreground line-clamp-1">
            <Link href={`/partners/${company.slug}`} className="hover:text-teal-500 transition-colors after:absolute after:inset-0 after:z-10">
              {company.name}
            </Link>
          </CardTitle>
          <p className="text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">
            {company.description}
          </p>
        </CardHeader>

        <CardContent className="px-5 pb-5 pt-0">
          {sectorsList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {sectorsList.map((sector, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white/5 text-slate-300 rounded"
                >
                  {sector}
                </span>
              ))}
            </div>
          ) : null}
        </CardContent>
      </div>

      <CardFooter className="flex items-center justify-end p-5 pt-4 border-t border-border/20 bg-muted/20">
        <div
          className={cn(buttonVariants({ size: "sm" }), "group select-none")}
        >
          Voir les détails
          <ArrowRight className="size-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
        </div>
      </CardFooter>
    </Card>
  );
}

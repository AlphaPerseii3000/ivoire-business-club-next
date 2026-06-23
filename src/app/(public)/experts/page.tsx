import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription-access";
import { canUserAccessOpportunity } from "@/lib/opportunity-visibility";
import { ExpertCard } from "@/components/features/experts/ExpertCard";
import { EmptyState } from "@/components/shared/empty-state";
import { Footer } from "@/components/landing/footer";
import LandingMobileNav from "@/components/landing/mobile-nav";
import { sanitizeError } from "@/lib/sanitize-log";
import type { Tier } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

interface ExpertsPageProps {
  searchParams: Promise<{ specialty?: string }>;
}

interface CustomSessionUser {
  id?: string;
  tier?: Tier | null;
  role?: string;
}

export default async function ExpertsPage({ searchParams }: ExpertsPageProps) {
  const resolvedSearchParams = await searchParams;
  const activeSpecialty = (typeof resolvedSearchParams.specialty === "string"
    ? resolvedSearchParams.specialty
    : Array.isArray(resolvedSearchParams.specialty) && resolvedSearchParams.specialty[0]
    ? resolvedSearchParams.specialty[0]
    : "Tous") || "Tous";

  // 1. Get current session and roles
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const user = session?.user as CustomSessionUser | undefined;
  const userId = user?.id;
  const userTier = user?.tier ?? null;
  const isAdmin = user?.role === "ADMIN";

  // 2. Validate subscription status
  const hasActiveSub = userId ? await hasActiveSubscription(userId) : false;

  // 3. Fetch all published experts from Database
  let experts: any[] = [];
  try {
    experts = await prisma.expert.findMany({
      where: {
        isPublished: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Failed to fetch experts:", sanitizeError(error));
    throw error;
  }

  // 4. Extract unique specialties for filtering
  const allSpecialtiesRaw = experts.flatMap((e) =>
    e.specialties
      ? e.specialties
          .split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : []
  );

  const uniqueSpecialties = Array.from(
    new Set(allSpecialtiesRaw.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()))
  ).sort() as string[];

  // 5. Filter experts based on selected specialty
  const filteredExperts =
    activeSpecialty !== "Tous"
      ? experts.filter((e) => {
          if (!e.specialties) return false;
          const list = e.specialties
            .split(",")
            .map((s: string) => s.trim().toLowerCase());
          return list.includes(activeSpecialty.toLowerCase().trim());
        })
      : experts;

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-white">
      {/* Mobile Navigation */}
      <LandingMobileNav />

      {/* Navigation Header */}
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
            <Link href="/experts" className="text-white hover:text-white transition-colors font-medium">
              Experts
            </Link>
            <Link href="/partners" className="text-slate-300 hover:text-white transition-colors">
              Partenaires
            </Link>
            <Link href="/events" className="text-slate-300 hover:text-white transition-colors font-medium">
              Événements
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

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 pt-32 py-12 md:pt-24 md:py-16">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#D4A847] bg-clip-text text-transparent sm:text-5xl">
            Nos Experts
          </h1>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            Consultez la liste des experts de l&apos;Ivoire Business Club et trouvez les meilleurs consultants pour vous accompagner dans vos projets et investissements.
          </p>
        </div>

        {/* Specialties Filters (Scrollable Chips) */}
        <div className="mb-10 border-b border-white/10 pb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Filtrer par spécialité">
            <Link
              href="/experts"
              className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
                activeSpecialty === "Tous"
                  ? "bg-[#D4A847] text-black shadow-md shadow-[#D4A847]/10"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              Tous
            </Link>
            {uniqueSpecialties.map((spec) => {
              const isActive = activeSpecialty.toLowerCase() === spec.toLowerCase();
              return (
                <Link
                  key={spec}
                  href={`/experts?specialty=${encodeURIComponent(spec)}`}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-[#D4A847] text-black shadow-md shadow-[#D4A847]/10"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {spec}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Experts Grid */}
        {filteredExperts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="experts-grid">
            {filteredExperts.map((expert) => {
              const hasAccess =
                isAdmin ||
                (isLoggedIn &&
                  hasActiveSub &&
                  canUserAccessOpportunity(expert.requiredTier, userTier));

              return <ExpertCard key={expert.id} expert={expert} hasAccess={hasAccess} />;
            })}
          </div>
        ) : (
          <div className="max-w-md mx-auto py-12">
            <EmptyState
              title="Aucun expert trouvé"
              description="Il n'y a pas d'experts disponibles pour la spécialité sélectionnée."
              action={
                <Link href="/experts" className="text-sm text-[#D4A847] hover:underline">
                  Voir tous les experts
                </Link>
              }
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

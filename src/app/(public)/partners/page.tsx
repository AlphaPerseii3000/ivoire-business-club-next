import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanyCard } from "@/components/features/partners/CompanyCard";
import { EmptyState } from "@/components/shared/empty-state";
import { sanitizeError } from "@/lib/sanitize-log";

export const dynamic = "force-dynamic";

const title = "Partenaires & entreprises agréées Côte d'Ivoire | IBC";
const description =
  "Découvrez les entreprises partenaires de l'Ivoire Business Club : BTP, services, communication et plus. Des partenaires de confiance en Côte d'Ivoire.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/partners',
  },
  openGraph: {
    title,
    description,
    type: "website",
    locale: "fr_FR",
  },
};

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  sectors: string | null;
}

interface PartnersPageProps {
  searchParams: Promise<{ sector?: string }>;
}

export default async function PartnersPage({ searchParams }: PartnersPageProps) {
  const resolvedSearchParams = await searchParams;
  const activeSector = (typeof resolvedSearchParams.sector === "string"
    ? resolvedSearchParams.sector
    : Array.isArray(resolvedSearchParams.sector) && resolvedSearchParams.sector[0]
    ? resolvedSearchParams.sector[0]
    : "Tous") || "Tous";

  // Récupérer la session actuelle
  const session = await auth();
  const isLoggedIn = !!session?.user;

  // Récupérer toutes les entreprises publiées de la base de données (uniquement les champs nécessaires)
  let companies: CompanyData[] = [];
  try {
    companies = await prisma.company.findMany({
      where: {
        isPublished: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        sectors: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Failed to fetch companies:", sanitizeError(error));
    throw error;
  }

  // Extraire les secteurs uniques pour le filtrage
  const allSectorsRaw = companies.flatMap((c) =>
    c.sectors
      ? c.sectors
          .split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : []
  );

  const uniqueSectors = Array.from(
    new Set(allSectorsRaw.map((s: string) => {
      const trimmed = s.trim();
      if (trimmed.toUpperCase() === trimmed) {
        return trimmed; // préserve les acronymes comme BTP, IT, etc.
      }
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }))
  ).sort() as string[];

  // Filtrer les entreprises en fonction du secteur sélectionné
  const filteredCompanies =
    activeSector !== "Tous"
      ? companies.filter((c) => {
          if (!c.sectors) return false;
          const list = c.sectors
            .split(",")
            .map((s) => s.trim().toLowerCase());
          return list.includes(activeSector.toLowerCase().trim());
        })
      : companies;

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-white">
      {/* Navigation mobile */}
      
      {/* En-tête de navigation */}
      
      {/* Contenu principal */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 pt-24 py-12 md:py-16">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#D4A847] bg-clip-text text-transparent sm:text-5xl">
            Partenaires Agréés & Entreprises
          </h1>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            Consultez la liste des entreprises agréées de l&apos;Ivoire Business Club. Des partenaires de confiance sélectionnés pour vous accompagner dans vos projets.
          </p>
        </div>


        {/* Filtres de secteurs (chips horizontaux défilants) */}
        <div className="mb-10 border-b border-white/10 pb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Filtrer par secteur">
            <Link
              href="/partners"
              className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
                activeSector === "Tous"
                  ? "bg-[#D4A847] text-black shadow-md shadow-[#D4A847]/10"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              Tous
            </Link>
            {uniqueSectors.map((sector) => {
              const isActive = activeSector.toLowerCase() === sector.toLowerCase();
              return (
                <Link
                  key={sector}
                  href={`/partners?sector=${encodeURIComponent(sector)}`}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-[#D4A847] text-black shadow-md shadow-[#D4A847]/10"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {sector}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Grille des entreprises */}
        {filteredCompanies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="companies-grid">
            {filteredCompanies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto py-12">
            <EmptyState
              title="Aucune entreprise trouvée"
              description="Il n'y a pas de partenaires agréés disponibles pour le secteur sélectionné."
              action={
                <Link href="/partners" className="text-sm text-[#D4A847] hover:underline">
                  Voir toutes les entreprises
                </Link>
              }
            />
          </div>
        )}
      </main>

          </div>
  );
}

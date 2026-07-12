import * as React from "react";
import { cache } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Mail, Phone, Globe, Building2, ShieldCheck, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sanitizeError } from "@/lib/sanitize-log";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { SITE_URL } from "@/lib/site-config";

export const dynamic = "force-dynamic";

const siteUrl = SITE_URL;

const cleanMarkdown = (markdown: string) => {
  if (!markdown) return "";
  return markdown
    .replace(/[#*`_~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
};

const getAbsoluteLogoUrl = (logoUrl: string | null | undefined, siteUrl: string) => {
  if (!logoUrl || logoUrl === "") return `${siteUrl}/logo-ibc.webp`;
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) return logoUrl;
  const path = logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`;
  return `${siteUrl}${path}`;
};

const formatExternalUrl = (url: string | null | undefined) => {
  if (!url) return "";
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
};

interface CompanyDetailPageProps {
  params: Promise<{ slug: string }>;
}

const getCompanyBySlug = cache(async (slug: string) => {
  return prisma.company.findUnique({
    where: { slug },
  });
});

export async function generateMetadata({ params }: CompanyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const company = await getCompanyBySlug(slug);

    if (!company) return {};

    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";

    // Si l'entreprise est un brouillon et que l'utilisateur n'est pas administrateur, ne pas divulguer les métadonnées
    if (!company.isPublished && !isAdmin) {
      return {
        title: "Entreprise non trouvée — Ivoire Business Club",
      };
    }

    const pageUrl = `${siteUrl}/partners/${slug}`;
    const imageUrl = getAbsoluteLogoUrl(company.logoUrl, siteUrl);
    const rawDescription = company.description || "Partenaire — Ivoire Business Club";
    const description = cleanMarkdown(rawDescription);

    return {
      title: {
        absolute: `${company.name} — Partenaire IBC`,
      },
      description: description.substring(0, 160),

      openGraph: {
        title: `${company.name} — Partenaire IBC`,
        description: description.substring(0, 160),
        type: "website",
        url: pageUrl,
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 800,
            alt: company.name,
          },
        ],
        locale: "fr_FR",
      },
    };
  } catch (e) {
    console.error("Failed to generate metadata:", sanitizeError(e));
    return {
      title: "Partenaire — Ivoire Business Club",
    };
  }
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { slug } = await params;

  // Récupérer les détails de l'entreprise
  let company;
  try {
    company = await getCompanyBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch company details:", sanitizeError(error));
    throw error;
  }

  if (!company) {
    notFound();
    return null;
  }

  // Vérification d'authentification pour les entreprises en brouillon (contournement administrateur)
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user?.role === "ADMIN";

  const isAccessibleDraft = company.isPublished || isAdmin;
  if (!isAccessibleDraft) {
    notFound();
    return null;
  }

  // Diviser et nettoyer les secteurs
  const sectorsList = company.sectors
    ? company.sectors
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  // Diviser et nettoyer les certifications
  const certificationsList = company.certifications
    ? company.certifications
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
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

  // Analyser la description en Markdown
  const htmlDescription = (() => {
    if (!company.description) return "";
    try {
      const rawHtml = marked.parse(company.description, { breaks: true, gfm: true }) as string;
      return DOMPurify.sanitize(rawHtml);
    } catch (error) {
      console.error("Failed to parse company description:", error);
      return DOMPurify.sanitize(company.description);
    }
  })();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": company.name,
    "description": cleanMarkdown(company.description),
    "image": getAbsoluteLogoUrl(company.logoUrl, siteUrl),
    "address": {
      "@type": "PostalAddress",
      "addressLocality": company.location || "Abidjan",
      "addressCountry": "CI",
    },
    "telephone": company.contactPhone || undefined,
    "email": company.contactEmail || undefined,
    "url": formatExternalUrl(company.website) || undefined,
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      {/* Navigation mobile */}
      

      {/* Navigation Header */}
      
      {/* Mise en page principale */}
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-12">
        {/* Lien de retour */}
        <Link
          href="/partners"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Retour aux partenaires
        </Link>

        {/* Mise en page de la carte de profil */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Informations de la barre latérale */}
          <div className="md:col-span-1 space-y-6">
            {company.logoUrl && company.logoUrl !== "" ? (
              <div className="relative aspect-[16/9] md:aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0e1628] flex items-center justify-center p-4">
                <Image
                  src={company.logoUrl}
                  alt={company.name}
                  fill
                  priority
                  unoptimized
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 300px"
                />
              </div>
            ) : (
              <div className="relative aspect-[16/9] md:aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex flex-col items-center justify-center">
                <div className="flex items-center justify-center size-24 rounded-full bg-[#D4A847]/10 text-[#D4A847] border border-[#D4A847]/20">
                  {initials ? (
                    <span className="text-3xl font-bold tracking-wider">{initials}</span>
                  ) : (
                    <Building2 className="size-12" />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-white leading-tight">{company.name}</h1>
                {company.location ? (
                  <p className="text-sm font-medium text-teal-400 mt-1">{company.location}</p>
                ) : null}
              </div>

              {sectorsList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {sectorsList.map((sector, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-0.5 text-xs font-medium bg-white/5 text-slate-300 rounded"
                    >
                      {sector}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Informations principales */}
          <div className="md:col-span-2 space-y-8">
            <div className="space-y-8 bg-[#0e1628]/40 border border-white/5 p-6 md:p-8 rounded-2xl">
              <div>
                <h2 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Description</h2>
                {htmlDescription ? (
                  <div
                    data-testid="company-description"
                    className="prose prose-stone dark:prose-invert max-w-none text-slate-300 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: htmlDescription }}
                  />
                ) : (
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{company.description}</p>
                )}
              </div>

              {certificationsList.length > 0 ? (
                <div>
                  <h2 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Certifications & Agréments</h2>
                  <div className="flex flex-col gap-2 pt-1">
                    {certificationsList.map((cert, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-slate-300">
                        <ShieldCheck className="size-4 text-teal-500 flex-shrink-0" />
                        <span>{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {(company.contactName || company.contactPhone || company.contactEmail || company.website) ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-white border-b border-white/10 pb-2">Contact & Liens</h2>
                  <div className="flex flex-col gap-3 max-w-md pt-2">
                    {company.contactName ? (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                        <User className="size-4 text-[#D4A847]" />
                        <span className="text-sm font-medium">Contact : {company.contactName}</span>
                      </div>
                    ) : null}

                    {company.website ? (
                      <Link
                        href={formatExternalUrl(company.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "w-full min-h-11 font-semibold border-white/10 text-slate-300 hover:text-white gap-2"
                        )}
                      >
                        <Globe className="size-4" />
                        Visiter le Site Web
                      </Link>
                    ) : null}

                    {company.contactEmail ? (
                      <Link
                        href={`mailto:${company.contactEmail}`}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "w-full min-h-11 font-semibold border-white/10 text-slate-300 hover:text-white gap-2"
                        )}
                      >
                        <Mail className="size-4" />
                        Envoyer un Email
                      </Link>
                    ) : null}

                    {company.contactPhone ? (
                      <Link
                        href={`tel:${company.contactPhone}`}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "w-full min-h-11 font-semibold border-white/10 text-slate-300 hover:text-white gap-2"
                        )}
                      >
                        <Phone className="size-4" />
                        Appeler au Téléphone
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}

            </div>
          </div>
        </div>
      </main>

          </div>
  );
}

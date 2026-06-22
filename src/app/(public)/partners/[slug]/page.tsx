import * as React from "react";
import { cache } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Mail, Phone, Globe, Building2, ShieldCheck, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Footer } from "@/components/landing/footer";
import LandingMobileNav from "@/components/landing/mobile-nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sanitizeError } from "@/lib/sanitize-log";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({ breaks: true, gfm: true });

export const dynamic = "force-dynamic";

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

    // If company is draft and user is not admin, do not leak metadata
    if (!company.isPublished && !isAdmin) {
      return {
        title: "Entreprise non trouvée — Ivoire Business Club",
      };
    }

    const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://ivoirebusinessclub.com").replace(/\/$/, "");
    const pageUrl = `${siteUrl}/partners/${slug}`;
    const imageUrl = company.logoUrl && company.logoUrl !== ""
      ? (company.logoUrl.startsWith("http") ? company.logoUrl : `${siteUrl}${company.logoUrl}`)
      : `${siteUrl}/logo-ibc.webp`;
    const description = company.description || "Partenaire — Ivoire Business Club";

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

  // Fetch the company details
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

  // Auth check for draft companies (Admin bypass)
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user?.role === "ADMIN";

  const isAccessibleDraft = company.isPublished || isAdmin;
  if (!isAccessibleDraft) {
    notFound();
    return null;
  }

  // Split and trim sectors
  const sectorsList = company.sectors
    ? company.sectors
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  // Split and trim certifications
  const certificationsList = company.certifications
    ? company.certifications
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    : [];

  // Generate initials for fallback
  const initials = company.name
    ? company.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  // Parse markdown description
  const htmlDescription = (() => {
    if (!company.description) return "";
    try {
      const rawHtml = marked.parse(company.description) as string;
      return DOMPurify.sanitize(rawHtml);
    } catch (error) {
      console.error("Failed to parse company description:", error);
      return company.description;
    }
  })();

  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://ivoirebusinessclub.com").replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": company.name,
    "description": company.description,
    "image": company.logoUrl && company.logoUrl !== ""
      ? (company.logoUrl.startsWith("http") ? company.logoUrl : `${siteUrl}${company.logoUrl}`)
      : `${siteUrl}/logo-ibc.webp`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": company.location || "Abidjan",
      "addressCountry": "CI",
    },
    "telephone": company.contactPhone || undefined,
    "email": company.contactEmail || undefined,
    "url": company.website || undefined,
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
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
            <Link href="/experts" className="text-slate-300 hover:text-white transition-colors font-medium">
              Experts
            </Link>
            <Link href="/partners" className="text-slate-300 hover:text-white transition-colors font-medium">
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

      {/* Main Layout */}
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-12">
        {/* Back Link */}
        <Link
          href="/partners"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Retour aux partenaires
        </Link>

        {/* Profile Card Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar Info */}
          <div className="md:col-span-1 space-y-6">
            {company.logoUrl && company.logoUrl !== "" ? (
              <div className="relative aspect-[16/9] md:aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0e1628] flex items-center justify-center p-4">
                <Image
                  src={company.logoUrl}
                  alt={company.name}
                  fill
                  priority
                  unoptimized
                  className="object-contain p-4"
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
                  <p className="text-sm font-medium text-teal-600 dark:text-teal-400 mt-1">{company.location}</p>
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

          {/* Main Info */}
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
                        href={company.website}
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

      <Footer />
    </div>
  );
}

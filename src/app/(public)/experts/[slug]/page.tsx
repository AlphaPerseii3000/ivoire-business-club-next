import * as React from "react";
import { cache } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Lock, ArrowLeft, ArrowRight, Mail, Phone, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription-access";
import { canUserAccessOpportunity } from "@/lib/opportunity-visibility";
import { WhatsAppCTA } from "@/components/features/deals/whatsapp-cta";
import { Footer } from "@/components/landing/footer";
import LandingMobileNav from "@/components/landing/mobile-nav";
import { buttonVariants } from "@/components/ui/button";
import { getTierBadgeConfig } from "@/lib/tier-config";
import { cn } from "@/lib/utils";
import type { Tier } from "@/generated/prisma/client";
import { sanitizeError } from "@/lib/sanitize-log";

export const dynamic = "force-dynamic";

interface ExpertDetailPageProps {
  params: Promise<{ slug: string }>;
}

interface CustomSessionUser {
  id?: string;
  tier?: Tier | null;
  role?: string;
}

const getExpertBySlug = cache(async (slug: string) => {
  return prisma.expert.findUnique({
    where: { slug },
  });
});

export async function generateMetadata({ params }: ExpertDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const expert = await getExpertBySlug(slug);

    if (!expert) return {};

    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";

    // If expert is draft and user is not admin, do not leak metadata
    if (!expert.isPublished && !isAdmin) {
      return {
        title: "Expert non trouvé — Ivoire Business Club",
      };
    }

    const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://ivoirebusinessclub.com").replace(/\/$/, "");
    const pageUrl = `${siteUrl}/experts/${slug}`;
    const imageUrl = expert.photoUrl && expert.photoUrl !== ""
      ? (expert.photoUrl.startsWith("http") ? expert.photoUrl : `${siteUrl}${expert.photoUrl}`)
      : `${siteUrl}/logo-ibc.webp`;
    const description = expert.title || "Expert — Ivoire Business Club";

    return {
      title: {
        absolute: `${expert.name} — Expert IBC`,
      },
      description,
      openGraph: {
        title: `${expert.name} — Expert IBC`,
        description,
        type: "profile",
        url: pageUrl,
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 800,
            alt: expert.name,
          },
        ],
        locale: "fr_FR",
      },
    };
  } catch (e) {
    console.error("Failed to generate metadata:", sanitizeError(e));
    return {
      title: "Expert — Ivoire Business Club",
    };
  }
}

export default async function ExpertDetailPage({ params }: ExpertDetailPageProps) {
  const { slug } = await params;

  // 1. Fetch the expert details
  let expert;
  try {
    expert = await getExpertBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch expert details:", sanitizeError(error));
    throw error;
  }

  if (!expert) {
    notFound();
    return null;
  }

  // 2. Auth & permissions checks
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const user = session?.user as CustomSessionUser | undefined;
  const userId = user?.id;
  const userTier = user?.tier ?? null;
  const isAdmin = user?.role === "ADMIN";

  // Redirect to notFound if not published, unless ADMIN
  const isAccessibleDraft = expert.isPublished || isAdmin;
  if (!isAccessibleDraft) {
    notFound();
    return null;
  }

  const hasActiveSub = userId ? await hasActiveSubscription(userId) : false;

  const hasAccess =
    isAdmin ||
    (isLoggedIn && hasActiveSub && canUserAccessOpportunity(expert.requiredTier, userTier));

  // 3. Pre-calculate layout and content elements
  const badgeConfig = getTierBadgeConfig(expert.requiredTier);
  const specialtiesList = expert.specialties
    ? expert.specialties
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  const initials = expert.name
    ? expert.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://ivoirebusinessclub.com").replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Person",
      "name": expert.name,
      "jobTitle": expert.title,
      "image": expert.photoUrl && expert.photoUrl !== ""
        ? (expert.photoUrl.startsWith("http") ? expert.photoUrl : `${siteUrl}${expert.photoUrl}`)
        : `${siteUrl}/logo-ibc.webp`,
      "description": expert.title || "Expert — Ivoire Business Club",
      "knowsAbout": specialtiesList,
    },
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
            <Link href="/experts" className="text-slate-300 hover:text-white transition-colors">
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

      {/* Main Layout */}
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-12">
        {/* Back Link */}
        <Link
          href="/experts"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Retour aux experts
        </Link>

        {/* Profile Card Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar Info */}
          <div className="md:col-span-1 space-y-6">
            {expert.photoUrl && expert.photoUrl !== "" ? (
              <div className="relative aspect-[1/1] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0e1628]">
                <Image
                  src={expert.photoUrl}
                  alt={expert.name}
                  fill
                  priority
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 300px"
                />
              </div>
            ) : (
              <div className="relative aspect-[1/1] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex flex-col items-center justify-center">
                <div className="flex items-center justify-center size-24 rounded-full bg-[#D4A847]/10 text-[#D4A847] border border-[#D4A847]/20">
                  {initials ? (
                    <span className="text-3xl font-bold tracking-wider">{initials}</span>
                  ) : (
                    <User className="size-12" />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={cn("px-2.5 py-0.5 text-xs font-medium rounded-full border", badgeConfig.className)}>
                  {!hasAccess ? <Lock className="size-3 mr-1.5 inline-block" /> : null}
                  {badgeConfig.label}
                </span>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white leading-tight">{expert.name}</h1>
                <p className="text-sm font-medium text-teal-600 dark:text-teal-400 mt-1">{expert.title}</p>
              </div>

              {specialtiesList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {specialtiesList.map((spec, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-0.5 text-xs font-medium bg-white/5 text-slate-300 rounded"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Main Info */}
          <div className="md:col-span-2 space-y-8">
            {hasAccess ? (
              <div className="space-y-8 bg-[#0e1628]/40 border border-white/5 p-6 md:p-8 rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Biographie</h2>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{expert.bio}</p>
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-white border-b border-white/10 pb-2">Moyens de contact</h2>
                  <div className="flex flex-col gap-3 max-w-md pt-2">
                    {expert.whatsapp ? (
                      <WhatsAppCTA
                        phoneNumber={expert.whatsapp}
                        prefilledMessage="Bonjour, je souhaite vous contacter concernant mes projets d'investissement sur IBC."
                        label="Contacter sur WhatsApp"
                      />
                    ) : null}

                    {expert.email ? (
                      <Link
                        href={`mailto:${expert.email}`}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "w-full min-h-11 font-semibold border-white/10 text-slate-300 hover:text-white gap-2"
                        )}
                      >
                        <Mail className="size-4" />
                        Envoyer un Email
                      </Link>
                    ) : null}

                    {expert.phone ? (
                      <Link
                        href={`tel:${expert.phone}`}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "w-full min-h-11 font-semibold border-white/10 text-slate-300 hover:text-white gap-2"
                        )}
                      >
                        <Phone className="size-4" />
                        Appeler par Téléphone
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Gate Panel (Encart Premium) */}
                <div
                  data-testid="gate-panel"
                  className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-b from-[#0e1628] to-[#070b12] p-8 text-center shadow-xl shadow-teal-500/5"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-24 bg-[#D4A847] rounded-b-full" />

                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal-500/10 text-[#D4A847] mb-6">
                    <Lock className="size-6" />
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight text-white mb-3">
                    Profil réservé aux membres Premium
                  </h3>

                  <p className="text-slate-300 max-w-md mx-auto mb-6 text-sm leading-relaxed">
                    Les coordonnées et la biographie complète de cet expert sont réservées aux membres de niveau{" "}
                    <span className="font-semibold text-teal-400">{badgeConfig.label}</span>.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {isLoggedIn ? (
                      <>
                        <Link
                          href="/pricing"
                          className={cn(
                            buttonVariants({ size: "lg" }),
                            "cursor-pointer w-full sm:w-auto bg-[#D4A847] text-black hover:bg-[#D4A847]/90 font-semibold"
                          )}
                        >
                          Abonnez-vous pour débloquer
                          <ArrowRight className="size-4 ml-1.5" />
                        </Link>

                        <Link
                          href="/dashboard/subscription"
                          className={cn(
                            buttonVariants({ size: "lg", variant: "outline" }),
                            "cursor-pointer w-full sm:w-auto border-white/10 text-slate-300 hover:text-white"
                          )}
                        >
                          Vérifier mon abonnement
                        </Link>
                      </>
                    ) : (
                      <Link
                        href="/auth/signin"
                        className={cn(
                          buttonVariants({ size: "lg" }),
                          "cursor-pointer w-full sm:w-auto bg-[#D4A847] text-black hover:bg-[#D4A847]/90 font-semibold"
                        )}
                      >
                        Se connecter pour débloquer
                        <ArrowRight className="size-4 ml-1.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

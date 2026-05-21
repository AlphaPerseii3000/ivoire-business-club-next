import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { PremiumAccessBlockedPanel } from "@/components/premium-access-blocked-panel";
import { ReviewList } from "@/components/features/reviews/review-list";
import { calculateReliabilityScore } from "@/lib/reputation";
import { getUserPremiumAccess } from "@/lib/subscription-access";
import { formatReliabilityScore } from "@/components/features/reputation/reliability-score";

const PAGE_SIZE = 10;

function parsePage(value: string | string[] | undefined): number {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(rawValue ?? "1", 10);
  const isValidNumber = Number.isFinite(parsed);
  const isValidPage = isValidNumber ? parsed >= 1 : false;
  return isValidPage ? parsed : 1;
}

export default async function MemberReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ page?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const page = parsePage(query.page);

  const access = await getUserPremiumAccess(session.user.id);
  if (!access.hasAccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href={`/members/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour au profil
        </Link>
        <div className="mt-6">
          <PremiumAccessBlockedPanel />
        </div>
      </div>
    );
  }

  const member = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      verificationStatus: true,
      _count: { select: { reviewsReceived: true } },
    },
  });

  if (!member || member.verificationStatus !== "VERIFIED") {
    notFound();
  }

  const [reviewRatings, reviews] = await Promise.all([
    prisma.review.findMany({ where: { revieweeId: member.id }, select: { rating: true } }),
    prisma.review.findMany({
      where: { revieweeId: member.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        reviewer: { select: { name: true, image: true } },
      },
    }),
  ]);

  const reliabilityScore = calculateReliabilityScore(reviewRatings);
  const totalReviewCount = member._count.reviewsReceived;
  const totalPages = Math.max(1, Math.ceil(totalReviewCount / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const averageCopy = reliabilityScore.averageRating !== null ? formatReliabilityScore(reliabilityScore.averageRating) : "—";
  const countLabel = `${totalReviewCount} avis reçu${totalReviewCount > 1 ? "s" : ""}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/members/${member.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour au profil
      </Link>

      <section className="mt-6 rounded-xl border bg-card p-6" aria-labelledby="member-reviews-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 id="member-reviews-title" className="text-xl font-bold">Tous les avis de {member.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {averageCopy} · {countLabel}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Page {page} / {totalPages}</p>
        </div>

        <div className="mt-6">
          <ReviewList reviews={reviews} />
        </div>

        <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Pagination des avis">
          {hasPreviousPage ? (
            <Link href={`/members/${member.id}/reviews?page=${page - 1}`} className={buttonVariants({ variant: "outline" })}>Page précédente</Link>
          ) : (
            <span />
          )}
          {hasNextPage ? (
            <Link href={`/members/${member.id}/reviews?page=${page + 1}`} className={buttonVariants({ variant: "outline" })}>Page suivante</Link>
          ) : null}
        </nav>
      </section>
    </div>
  );
}

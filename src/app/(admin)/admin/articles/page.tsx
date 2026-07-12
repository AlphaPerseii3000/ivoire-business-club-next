import { auth } from "@/lib/auth";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArticleVisibility } from "@/lib/validations";
import { cn } from "@/lib/utils";

import ArticlesListTable from "@/components/features/admin/articles-list-table";
import { Button, buttonVariants } from "@/components/ui/button";

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const currentAdminId = session.user.id;

  const admin = await promoteConfiguredAdminUser(currentAdminId);
  if (admin?.role !== "ADMIN") redirect("/dashboard");

  const query = (await searchParams) ?? {};
  const pageRaw = Array.isArray(query.page) ? query.page[0] : query.page;
  const page = Math.min(100000, Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1));
  const limit = 20;
  const skip = (page - 1) * limit;

  const [articles, totalCount] = await Promise.all([
    prisma.article.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            name: true,
          },
        },
        opportunity: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.article.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const showPagination = totalPages > 1;

  // Serialize dates for Client Component safety
  const serializedArticles = articles.map((art) => ({
    ...art,
    createdAt: art.createdAt.toISOString(),
    updatedAt: art.updatedAt.toISOString(),
    publishedAt: art.publishedAt ? art.publishedAt.toISOString() : null,
    visibility: art.visibility as unknown as ArticleVisibility,
    opportunity: art.opportunity
      ? {
          id: art.opportunity.id,
          title: art.opportunity.title,
        }
      : null,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Articles</h1>
          <p className="text-sm text-muted-foreground">
            Publiez et organisez le contenu éditorial d'Ivoire Business Club.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" render={<Link href="/admin/articles/new" />} className="min-h-11" nativeButton={false}>
            Créer un article
          </Button>
          <a
            href="/admin/dashboard"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Retour au dashboard
          </a>
        </div>
      </div>

      <ArticlesListTable articles={serializedArticles} />

      {showPagination ? (
        <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Pagination des articles">
          {hasPreviousPage ? (
            <Link
              href={`/admin/articles?page=${page - 1}`}
              className={cn(buttonVariants({ variant: "outline" }), "min-h-11 inline-flex items-center justify-center")}
            >
              Page précédente
            </Link>
          ) : (
            <span className="min-h-11" />
          )}
          <p className="text-sm text-muted-foreground">Page {page} / {totalPages}</p>
          {hasNextPage ? (
            <Link
              href={`/admin/articles?page=${page + 1}`}
              className={cn(buttonVariants({ variant: "outline" }), "min-h-11 inline-flex items-center justify-center")}
            >
              Page suivante
            </Link>
          ) : (
            <span className="min-h-11" />
          )}
        </nav>
      ) : null}
    </div>
  );
}

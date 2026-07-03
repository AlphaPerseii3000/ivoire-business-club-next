import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Tier, Prisma } from "@/generated/prisma/client";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { MemberSearchInput } from "./_components/member-search-input";

const PAGE_SIZE = 20;

const tierLabels: Record<string, string> = {
  AFFRANCHI: "Affranchi",
  GRAND_FRERE: "Grand Frère",
  BOSS: "Boss",
};

const tierColors: Record<string, string> = {
  AFFRANCHI: "bg-secondary text-secondary-foreground",
  GRAND_FRERE: "bg-primary text-primary-foreground",
  BOSS: "bg-accent text-accent-foreground",
};

const sortLabels: Record<string, string> = {
  name_asc: "Nom A → Z",
  name_desc: "Nom Z → A",
  recent: "Plus récents",
  oldest: "Plus anciens",
};

const validTierValues: string[] = ["AFFRANCHI", "GRAND_FRERE", "BOSS"];
const validSortValues: string[] = ["name_asc", "name_desc", "recent", "oldest"];

const sortOrder: Record<"name_asc" | "name_desc" | "recent" | "oldest", Prisma.UserOrderByWithRelationInput> = {
  name_asc: { name: "asc" },
  name_desc: { name: "desc" },
  recent: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
};

const defaultOrderBy: Prisma.UserOrderByWithRelationInput = { createdAt: "desc" };

function parseStringParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function buildSearchParams(params: Record<string, string | undefined>): string {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val) next.set(key, val);
  });
  return next.toString();
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[]; tier?: string | string[]; sort?: string | string[]; page?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const sessionUser = session.user as unknown as { emailVerified?: boolean; onboardingCompleted?: boolean };
  if (!sessionUser.emailVerified || !sessionUser.onboardingCompleted) {
    redirect("/dashboard?incomplete=1");
  }

  const query = searchParams ? await searchParams : {};
  const q = parseStringParam(query.q)?.trim();
  const tierRaw = parseStringParam(query.tier);
  const sortRaw = parseStringParam(query.sort);
  const pageRaw = parseStringParam(query.page);

  const tier = validTierValues.includes(tierRaw ?? "") ? (tierRaw as Tier) : undefined;
  const sort = validSortValues.includes(sortRaw ?? "") ? (sortRaw as keyof typeof sortOrder) : undefined;
  const orderBy = sort ? sortOrder[sort] : defaultOrderBy;

  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Prisma.UserWhereInput = {
    verificationStatus: "VERIFIED",
    ...(tier ? { tier } : {}),
    ...(q ? { name: { contains: q } } : {}),
  };

  const [members, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        location: true,
        country: true,
        tier: true,
        bio: true,
        image: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPreviousPage = page > 1 && totalPages > 1;
  const hasNextPage = page < totalPages;
  const showEmptyState = members.length === 0;
  const showPagination = totalPages > 1;

  const tierOptions: Array<{ value: string; label: string }> = [
    { value: "", label: "Tous" },
    { value: "AFFRANCHI", label: tierLabels.AFFRANCHI },
    { value: "GRAND_FRERE", label: tierLabels.GRAND_FRERE },
    { value: "BOSS", label: tierLabels.BOSS },
  ];

  const sortOptions: Array<{ value: string; label: string }> = [
    { value: "name_asc", label: sortLabels.name_asc },
    { value: "name_desc", label: sortLabels.name_desc },
    { value: "recent", label: sortLabels.recent },
    { value: "oldest", label: sortLabels.oldest },
  ];

  const currentFilters = buildSearchParams({ q, tier: tier ?? "", sort });
  const previousSearch = buildSearchParams({ q, tier: tier ?? "", sort, page: String(page - 1) });
  const nextSearch = buildSearchParams({ q, tier: tier ?? "", sort, page: String(page + 1) });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Membres</h1>
      <p className="mt-1 text-muted-foreground">Découvre les membres vérifiés du club</p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <MemberSearchInput defaultValue={q} />

        <div className="flex items-center gap-3">
          <div role="group" aria-label="Filtrer par tier" className="flex gap-2 overflow-x-auto pb-1">
            {tierOptions.map((option) => {
              const isActive = tier === option.value || (!tier && option.value === "");
              const tierSearch = buildSearchParams({ q, tier: option.value, sort, page: undefined });
              return (
                <Link
                  key={option.value || "all"}
                  href={`/members${tierSearch ? `?${tierSearch}` : ""}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`inline-flex h-9 items-center rounded-full border px-3 text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <div className="w-full sm:w-auto">
          <div
            role="group"
            aria-label="Trier les membres"
            className="flex flex-wrap items-center justify-end gap-2"
          >
            {sortOptions.map((option) => {
              const sortSearch = buildSearchParams({ q, tier: tier ?? "", sort: option.value, page: undefined });
              const isSortActive = sort === option.value;
              return (
                <Link
                  key={option.value}
                  href={`/members?${sortSearch}`}
                  className={cn(
                    "inline-flex h-8 items-center rounded-lg border px-3 text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isSortActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  )}
                  aria-current={isSortActive ? "true" : undefined}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {showEmptyState ? (
        <div className="mt-12 flex flex-col items-center gap-4 text-center text-muted-foreground">
          <p>Aucun membre ne correspond à vos critères</p>
          <Link href="/members" className={buttonVariants({ variant: "outline" })}>Réinitialiser les filtres</Link>
        </div>
      ) : null}

      {!showEmptyState ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/members/${m.id}`}
              className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <span className={`inline-block rounded-md px-2 py-0.5 text-xs ${tierColors[m.tier] ?? "bg-muted"}`}>
                    {tierLabels[m.tier] ?? m.tier}
                  </span>
                </div>
              </div>
              {m.bio ? <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{m.bio}</p> : null}
              <div className="mt-3 text-xs text-muted-foreground">
                {[m.location, m.country].filter(Boolean).join(" — ")}
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {showPagination ? (
        <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Pagination des membres">
          {hasPreviousPage ? (
            <Link href={`/members?${previousSearch}`} className={buttonVariants({ variant: "outline" })}>Page précédente</Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted-foreground">Page {page} / {totalPages}</p>
          {hasNextPage ? (
            <Link href={`/members?${nextSearch}`} className={buttonVariants({ variant: "outline" })}>Page suivante</Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

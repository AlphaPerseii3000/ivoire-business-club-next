import { AdminMemberActions } from "@/components/features/admin/admin-member-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, Tier, UserStatus, VerificationStatus, SubscriptionStatus } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { isEligibleForVerification } from "@/lib/verification";
import Link from "next/link";
import { AdminMemberSearchInput } from "./_components/admin-member-search-input";
import { AdminMemberFilterSelect } from "./_components/admin-member-filter-select";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const tierLabels: Record<string, string> = {
  AFFRANCHI: "Affranchi",
  GRAND_FRERE: "Grand Frère",
  BOSS: "Boss",
};

const accountStatusLabels: Record<string, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
};

const verificationStatusLabels: Record<string, string> = {
  PENDING: "En attente",
  EN_COURS: "En cours",
  VERIFIED: "Vérifié ✓",
  REJECTED: "Rejeté",
};

const verificationBadgeClasses: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  EN_COURS: "bg-blue-100 text-blue-800",
  VERIFIED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

const subscriptionStatusLabels: Record<string, string> = {
  TRIAL: "TRIAL",
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELLED: "CANCELLED",
};

const sortLabels: Record<string, string> = {
  name_asc: "Nom A → Z",
  name_desc: "Nom Z → A",
  recent: "Plus récents",
  oldest: "Plus anciens",
};

const validTierValues = ["AFFRANCHI", "GRAND_FRERE", "BOSS"];
const validSubscriptionValues = ["TRIAL", "PENDING", "ACTIVE", "PAST_DUE", "CANCELLED"];
const validStatusValues = ["ACTIVE", "SUSPENDED"];
const validVerificationValues = ["PENDING", "EN_COURS", "VERIFIED", "REJECTED"];
const validSortValues = ["name_asc", "name_desc", "recent", "oldest"];

const sortOrder: Record<string, Prisma.UserOrderByWithRelationInput> = {
  name_asc: { name: "asc" },
  name_desc: { name: "desc" },
  recent: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
};

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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.at(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[]; tier?: string | string[]; subscription?: string | string[]; status?: string | string[]; verification?: string | string[]; sort?: string | string[]; page?: string | string[]; incomplete?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const currentAdminId = session.user.id;

  const admin = await promoteConfiguredAdminUser(currentAdminId);
  if (admin?.role !== "ADMIN") redirect("/dashboard");

  const query = (await searchParams) ?? {};

  const MAX_QUERY_LENGTH = 100;
  const qRaw = parseStringParam(query.q)?.trim().slice(0, MAX_QUERY_LENGTH);
  const tierRaw = parseStringParam(query.tier);
  const subscriptionRaw = parseStringParam(query.subscription);
  const statusRaw = parseStringParam(query.status);
  const verificationRaw = parseStringParam(query.verification);
  const sortRaw = parseStringParam(query.sort);
  const pageRaw = parseStringParam(query.page);
  const incomplete = parseStringParam(query.incomplete);
  const showIncompleteOnly = incomplete === "1";

  const q = qRaw ? qRaw : undefined;
  const tier = validTierValues.includes(tierRaw ?? "") ? (tierRaw as Tier) : undefined;
  const subscription = validSubscriptionValues.includes(subscriptionRaw ?? "") ? (subscriptionRaw as SubscriptionStatus) : undefined;
  const status = validStatusValues.includes(statusRaw ?? "") ? (statusRaw as UserStatus) : undefined;
  const verification = validVerificationValues.includes(verificationRaw ?? "") ? (verificationRaw as VerificationStatus) : undefined;
  const sort = validSortValues.includes(sortRaw ?? "") ? sortRaw : undefined;
  const orderBy = sortOrder[sort ?? ""] ?? { createdAt: "desc" };
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const andConditions: Prisma.UserWhereInput[] = [];
  if (showIncompleteOnly) {
    andConditions.push({ OR: [{ emailVerified: false }, { onboardingCompletedAt: null }] });
  }
  if (tier) andConditions.push({ tier });
  if (status) andConditions.push({ status });
  if (verification) andConditions.push({ verificationStatus: verification });
  if (subscription) andConditions.push({ subscriptions: { some: { status: subscription } } });
  if (q) {
    andConditions.push({
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
      ],
    });
  }

  const whereClause: Prisma.UserWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  const [members, totalCount] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        image: true,
        name: true,
        email: true,
        tier: true,
        status: true,
        verificationStatus: true,
        emailVerified: true,
        onboardingCompletedAt: true,
        bio: true,
        location: true,
        country: true,
        createdAt: true,
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, tier: true, providerRef: true, createdAt: true },
        },
      },
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  const hasMembers = members.length > 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPreviousPage = page > 1 && totalPages > 1;
  const hasNextPage = page < totalPages;
  const showPagination = totalPages > 1;
  const activeFiltersCount = [q, tier, subscription, status, verification, showIncompleteOnly].filter(Boolean).length;
  const hasActiveFilters = activeFiltersCount > 0;
  const showResetEmptyState = hasActiveFilters && !hasMembers;
  const showGenericEmptyState = !hasActiveFilters && !hasMembers;

  const tierOptions = [
    { value: "", label: "Tous les tiers" },
    { value: "AFFRANCHI", label: tierLabels.AFFRANCHI },
    { value: "GRAND_FRERE", label: tierLabels.GRAND_FRERE },
    { value: "BOSS", label: tierLabels.BOSS },
  ];

  const subscriptionOptions = [
    { value: "", label: "Tous les abonnements" },
    { value: "TRIAL", label: subscriptionStatusLabels.TRIAL },
    { value: "PENDING", label: subscriptionStatusLabels.PENDING },
    { value: "ACTIVE", label: subscriptionStatusLabels.ACTIVE },
    { value: "PAST_DUE", label: subscriptionStatusLabels.PAST_DUE },
    { value: "CANCELLED", label: subscriptionStatusLabels.CANCELLED },
  ];

  const statusOptions = [
    { value: "", label: "Tous les statuts" },
    { value: "ACTIVE", label: accountStatusLabels.ACTIVE },
    { value: "SUSPENDED", label: accountStatusLabels.SUSPENDED },
  ];

  const verificationOptions = [
    { value: "", label: "Toutes les vérifications" },
    { value: "PENDING", label: verificationStatusLabels.PENDING },
    { value: "EN_COURS", label: verificationStatusLabels.EN_COURS },
    { value: "VERIFIED", label: verificationStatusLabels.VERIFIED },
    { value: "REJECTED", label: verificationStatusLabels.REJECTED },
  ];

  const sortOptions = [
    { value: "", label: "Tri par défaut" },
    { value: "name_asc", label: sortLabels.name_asc },
    { value: "name_desc", label: sortLabels.name_desc },
    { value: "recent", label: sortLabels.recent },
    { value: "oldest", label: sortLabels.oldest },
  ];

  const previousSearch = buildSearchParams({
    q,
    tier: tier ?? "",
    subscription: subscription ?? "",
    status: status ?? "",
    verification: verification ?? "",
    sort: sort ?? "",
    page: String(page - 1),
    incomplete: showIncompleteOnly ? "1" : undefined,
  });
  const nextSearch = buildSearchParams({
    q,
    tier: tier ?? "",
    subscription: subscription ?? "",
    status: status ?? "",
    verification: verification ?? "",
    sort: sort ?? "",
    page: String(page + 1),
    incomplete: showIncompleteOnly ? "1" : undefined,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Membres</h1>
          <p className="text-sm text-muted-foreground">Gérez les comptes utilisateurs, leur statut et les emails admin.</p>
        </div>
        <a href="/admin/dashboard" className="min-h-11 text-sm text-muted-foreground hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          ← Retour au dashboard
        </a>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {showIncompleteOnly ? (
          <>
            <Badge variant="destructive" className="rounded-full px-3 py-1 text-xs">
              Incomplets uniquement
            </Badge>
            <Link
              href={`/admin/members?${buildSearchParams({ q, tier: tier ?? "", subscription: subscription ?? "", status: status ?? "", verification: verification ?? "", sort: sort ?? "" })}`}
              className="min-h-11 inline-flex items-center rounded-md px-3 py-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Voir tous
            </Link>
          </>
        ) : (
          <Link
            href={`/admin/members?${buildSearchParams({ q, tier: tier ?? "", subscription: subscription ?? "", status: status ?? "", verification: verification ?? "", sort: sort ?? "", incomplete: "1" })}`}
            className="min-h-11 inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Afficher les incomplèts
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="md:col-span-2 lg:col-span-5">
          <AdminMemberSearchInput defaultValue={q} />
        </div>

        <AdminMemberFilterSelect
          value={tier}
          placeholder="Tous les tiers"
          options={tierOptions}
          ariaLabel="Filtrer par tier"
          q={q}
          tier={tier}
          subscription={subscription}
          status={status}
          verification={verification}
          sort={sort}
          paramName="tier"
        />

        <AdminMemberFilterSelect
          value={subscription}
          placeholder="Tous les abonnements"
          options={subscriptionOptions}
          ariaLabel="Filtrer par statut d'abonnement"
          q={q}
          tier={tier}
          subscription={subscription}
          status={status}
          verification={verification}
          sort={sort}
          paramName="subscription"
        />

        <AdminMemberFilterSelect
          value={status}
          placeholder="Tous les statuts"
          options={statusOptions}
          ariaLabel="Filtrer par statut de compte"
          q={q}
          tier={tier}
          subscription={subscription}
          status={status}
          verification={verification}
          sort={sort}
          paramName="status"
        />

        <AdminMemberFilterSelect
          value={verification}
          placeholder="Toutes les vérifications"
          options={verificationOptions}
          ariaLabel="Filtrer par statut de vérification"
          q={q}
          tier={tier}
          subscription={subscription}
          status={status}
          verification={verification}
          sort={sort}
          paramName="verification"
        />

        <AdminMemberFilterSelect
          value={sort}
          placeholder="Tri par défaut"
          options={sortOptions}
          ariaLabel="Trier les membres"
          q={q}
          tier={tier}
          subscription={subscription}
          status={status}
          verification={verification}
          sort={sort}
          paramName="sort"
        />
      </div>

      {showResetEmptyState ? (
        <div className="mt-12 flex flex-col items-center gap-4 text-center text-muted-foreground">
          <p>Aucun membre ne correspond à vos critères</p>
          <Link href="/admin/members" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Réinitialiser les filtres</Link>
        </div>
      ) : null}

      {showGenericEmptyState ? (
        <div className="mt-8 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Aucun utilisateur à afficher pour le moment.
        </div>
      ) : null}

      {hasMembers ? (
        <div className="mt-6 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium">Membre</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Tier</th>
                <th className="px-4 py-3 text-left font-medium">Abonnement</th>
                <th className="px-4 py-3 text-left font-medium">Statut compte</th>
                <th className="px-4 py-3 text-left font-medium">Vérification</th>
                <th className="px-4 py-3 text-left font-medium">Onboarding</th>
                <th className="px-4 py-3 text-left font-medium">Inscription</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const latestSubscription = member.subscriptions[0] ?? null;
                const subscriptionLabel = latestSubscription
                  ? subscriptionStatusLabels[latestSubscription.status] ?? latestSubscription.status
                  : "Aucun abonnement";
                const accountLabel = accountStatusLabels[member.status] ?? member.status;
                const verificationLabel = verificationStatusLabels[member.verificationStatus] ?? member.verificationStatus;
                const verificationBadge = verificationBadgeClasses[member.verificationStatus] ?? "bg-muted text-muted-foreground";
                const dateLabel = member.createdAt.toLocaleDateString("fr-FR");
                const isCurrentAdmin = member.id === currentAdminId;
                const hasEmail = Boolean(member.email);
                const tierLabel = tierLabels[member.tier] ?? member.tier;
                const accountBadgeClass = member.status === "SUSPENDED" ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-800";
                const eligibility = isEligibleForVerification(member);
                const emailOk = !eligibility.missingPrerequisites.includes("EMAIL_UNVERIFIED");
                const profileOk = !eligibility.missingPrerequisites.includes("BIO_MISSING") && !eligibility.missingPrerequisites.includes("LOCATION_MISSING") && !eligibility.missingPrerequisites.includes("COUNTRY_MISSING");
                const statusOk = !eligibility.missingPrerequisites.includes("ACCOUNT_SUSPENDED");
                const emailVerifiedOk = member.emailVerified === true;
                const profileCompleted = member.onboardingCompletedAt !== null;
                const showEmailBadge = true;
                const showProfileBadge = true;

                return (
                  <tr key={member.id} className="border-b hover:bg-muted/40">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-muted-foreground">
                          {member.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={member.image} alt={`Avatar de ${member.name}`} className="size-full object-cover" />
                          ) : (
                            <span>{initials(member.name)}</span>
                          )}
                        </div>
                        <Link href={`/admin/members/${member.id}`} className="font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                          {member.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{member.email}</td>
                    <td className="px-4 py-4">{tierLabel}</td>
                    <td className="px-4 py-4">{subscriptionLabel}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${accountBadgeClass}`}>{accountLabel}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium self-start ${verificationBadge}`}>{verificationLabel}</span>
                        <div className="flex flex-wrap gap-2 text-[10px] font-medium mt-1">
                          <span
                            className={emailOk ? "text-emerald-700" : "text-muted-foreground/80"}
                            title={emailOk ? "Email vérifié" : "Email non vérifié"}
                          >
                            {emailOk ? "✓ Email" : "✗ Email"}
                          </span>
                          <span
                            className={profileOk ? "text-emerald-700" : "text-muted-foreground/80"}
                            title={profileOk ? "Profil complété" : "Profil incomplet"}
                          >
                            {profileOk ? "✓ Profil" : "✗ Profil"}
                          </span>
                          <span
                            className={statusOk ? "text-emerald-700" : "text-muted-foreground/80"}
                            title={statusOk ? "Compte actif" : "Compte suspendu"}
                          >
                            {statusOk ? "✓ Actif" : "✗ Actif"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {showEmailBadge ? (
                          <Badge
                            variant={emailVerifiedOk ? "default" : "destructive"}
                            className={`rounded-full px-2 py-1 text-xs font-medium ${emailVerifiedOk ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-orange-100 text-orange-800 hover:bg-orange-100"}`}
                          >
                            {emailVerifiedOk ? "Email ✓" : "Email ✗"}
                          </Badge>
                        ) : null}
                        {showProfileBadge ? (
                          <Badge
                            variant={profileCompleted ? "default" : "destructive"}
                            className={`rounded-full px-2 py-1 text-xs font-medium ${profileCompleted ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-orange-100 text-orange-800 hover:bg-orange-100"}`}
                          >
                            {profileCompleted ? "Profil ✓" : "Profil ✗"}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{dateLabel}</td>
                    <td className="px-4 py-4">
                      <AdminMemberActions
                        userId={member.id}
                        status={member.status}
                        verificationStatus={member.verificationStatus}
                        isCurrentAdmin={isCurrentAdmin}
                        hasEmail={hasEmail}
                        canVerifyMember={eligibility.eligible}
                        missingPrerequisites={eligibility.missingPrerequisites}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {showPagination ? (
        <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Pagination des membres">
          {hasPreviousPage ? (
            <Link href={`/admin/members?${previousSearch}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Page précédente</Link>
          ) : (
            <span className="min-h-11" />
          )}
          <p className="text-sm text-muted-foreground">Page {page} / {totalPages}</p>
          {hasNextPage ? (
            <Link href={`/admin/members?${nextSearch}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Page suivante</Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { auth } from "@/lib/auth";
import { queryAuditLogs } from "@/lib/audit-log";

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_MIN = 10;
const PAGE_SIZE_MAX = 100;

type AuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clampPageSize(value: number) {
  return Math.min(PAGE_SIZE_MAX, Math.max(PAGE_SIZE_MIN, value));
}

function maskEmail(email: string | null | undefined) {
  if (!email) return "Email non disponible";
  const [name, domain] = email.split("@");
  const prefix = name ? `${name.slice(0, 2)}…` : "…";
  return domain ? `${prefix}@${domain}` : prefix;
}

function summarizeMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "Aucun détail";
  const entries = Object.entries(metadata as Record<string, unknown>).slice(0, 4);
  if (entries.length === 0) return "Aucun détail";
  return entries.map(([key, value]) => `${key}: ${typeof value === "object" ? "…" : String(value)}`).join(" · ");
}

function buildQuery(params: Record<string, string | undefined>, overrides: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  const merged = { ...params, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && String(value).trim() !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `/admin/audit?${query}` : "/admin/audit";
}

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await promoteConfiguredAdminUser(session.user.id);
  if (user?.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const action = firstParam(params.action)?.trim() || undefined;
  const entityType = firstParam(params.entityType)?.trim() || undefined;
  const actorId = firstParam(params.actorId)?.trim() || undefined;
  const q = firstParam(params.q)?.trim() || undefined;
  const fromRaw = firstParam(params.from)?.trim() || undefined;
  const toRaw = firstParam(params.to)?.trim() || undefined;
  const page = parsePositiveInt(firstParam(params.page), 1);
  const pageSize = clampPageSize(parsePositiveInt(firstParam(params.pageSize), DEFAULT_PAGE_SIZE));
  const from = fromRaw ? new Date(`${fromRaw}T00:00:00.000Z`) : undefined;
  const to = toRaw ? new Date(`${toRaw}T23:59:59.999Z`) : undefined;
  const invalidDateFilter = Boolean((fromRaw && Number.isNaN(from?.getTime())) || (toRaw && Number.isNaN(to?.getTime())));
  const invalidRange = Boolean(from && to && from > to);

  const result = invalidDateFilter || invalidRange
    ? { logs: [], page, pageSize, total: 0, totalPages: 1 }
    : await queryAuditLogs({ page, pageSize, action, entityType, actorId, from, to, q });

  const currentQuery = { action, entityType, actorId, q, from: fromRaw, to: toRaw, pageSize: String(pageSize) };
  const previousPageHref = buildQuery(currentQuery, { page: Math.max(1, page - 1) });
  const nextPageHref = buildQuery(currentQuery, { page: Math.min(result.totalPages, page + 1) });
  const hasLogs = result.logs.length > 0;
  const canGoPrevious = page > 1;
  const canGoNext = page < result.totalPages;
  const hasFilterError = invalidDateFilter || invalidRange;
  const filterErrorText = invalidDateFilter ? "Une date de filtre est invalide." : invalidRange ? "La date de début doit précéder la date de fin." : "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Administration</p>
        <h1 className="text-2xl font-bold tracking-tight">Journal d&apos;audit</h1>
        <p className="mt-2 text-sm text-muted-foreground">Historique immuable des actions critiques de conformité.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3" action="/admin/audit">
            <label className="space-y-2 text-sm font-medium">
              Action
              <Input name="action" defaultValue={action ?? ""} placeholder="SUBSCRIPTION_VALIDATE" className="min-h-11" />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Type d&apos;entité
              <Input name="entityType" defaultValue={entityType ?? ""} placeholder="Opportunity" className="min-h-11" />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Acteur
              <Input name="actorId" defaultValue={actorId ?? ""} placeholder="ID admin" className="min-h-11" />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Du
              <Input type="date" name="from" defaultValue={fromRaw ?? ""} className="min-h-11" />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Au
              <Input type="date" name="to" defaultValue={toRaw ?? ""} className="min-h-11" />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Recherche texte / ID
              <Input name="q" defaultValue={q ?? ""} placeholder="entityId, action…" className="min-h-11" />
            </label>
            <input type="hidden" name="pageSize" value={pageSize} />
            <div className="flex flex-wrap gap-3 md:col-span-3">
              <Button type="submit" className="min-h-11">Filtrer</Button>
              <Link href="/admin/audit" className={buttonVariants({ variant: "outline", className: "min-h-11" })}>Réinitialiser les filtres</Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {hasFilterError ? <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{filterErrorText}</p> : null}

      <Card>
        <CardContent className="pt-6">
          {hasLogs ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Horodatage</th>
                    <th className="p-3">Admin</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Entité</th>
                    <th className="p-3">ID entité</th>
                    <th className="p-3">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {result.logs.map((log) => {
                    const actorLabel = log.actor?.name ?? maskEmail(log.actor?.email);
                    const metadataSummary = summarizeMetadata(log.metadata);
                    const metadataJson = JSON.stringify(log.metadata ?? {}, null, 2);
                    return (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="p-3 align-top">
                          <time dateTime={log.createdAt.toISOString()}>{log.createdAt.toLocaleString("fr-FR")}</time>
                        </td>
                        <td className="p-3 align-top">{actorLabel}</td>
                        <td className="p-3 align-top font-medium">{log.action}</td>
                        <td className="p-3 align-top">{log.entityType}</td>
                        <td className="p-3 align-top font-mono text-xs">{log.entityId}</td>
                        <td className="p-3 align-top">
                          <details>
                            <summary className="min-h-11 cursor-pointer rounded px-2 py-2 focus:outline-none focus:ring-2 focus:ring-ring">{metadataSummary}</summary>
                            <pre className="mt-2 max-w-xl whitespace-pre-wrap rounded bg-muted p-3 text-xs">{metadataJson}</pre>
                          </details>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Aucun événement d&apos;audit trouvé.</p>
              <Link href="/admin/audit" className={buttonVariants({ variant: "outline", className: "min-h-11" })}>Réinitialiser les filtres</Link>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>Page {result.page} sur {result.totalPages} — {result.total} événement(s)</p>
            <div className="flex gap-2">
              {canGoPrevious ? <Link href={previousPageHref} className={buttonVariants({ variant: "outline", className: "min-h-11" })}>Précédent</Link> : <Button variant="outline" disabled className="min-h-11">Précédent</Button>}
              {canGoNext ? <Link href={nextPageHref} className={buttonVariants({ variant: "outline", className: "min-h-11" })}>Suivant</Link> : <Button variant="outline" disabled className="min-h-11">Suivant</Button>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

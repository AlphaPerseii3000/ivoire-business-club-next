import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsMetric, TrendDirection } from "@/lib/admin-analytics";
import { cn } from "@/lib/utils";

export function AdminMetricsCards({ metrics }: { metrics: AnalyticsMetric[] }) {
  return (
    <section aria-label="Métriques clés" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.id} className="min-h-44">
          <CardHeader className="gap-2">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
              <TrendBadge trend={metric.trend} label={metric.trendLabel} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="break-words text-3xl font-bold tracking-tight">{metric.value}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{metric.help}</p>
            </div>
            <div className="space-y-3">
              <p className={cn("text-sm font-medium", getVariationClass(metric.trend))}>{metric.variationLabel}</p>
              <MiniTrend series={metric.trendSeries} trend={metric.trend} label={metric.trendLabel} />
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function TrendBadge({ trend, label }: { trend: TrendDirection; label: string }) {
  const Icon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : ArrowRight;
  return (
    <Badge variant="outline" className={cn("min-h-6 gap-1", getVariationClass(trend))} aria-label={label}>
      <Icon aria-hidden="true" className="size-3" />
      <span>{trend === "up" ? "Hausse" : trend === "down" ? "Baisse" : "Stable"}</span>
    </Badge>
  );
}

function MiniTrend({ series, trend, label }: { series: number[]; trend: TrendDirection; label: string }) {
  const max = Math.max(...series, 1);
  const normalized = series.map((value) => Math.max(18, Math.round((value / max) * 100)));
  return (
    <div className="flex h-10 items-end gap-1" role="img" aria-label={`${label}. Mini-tendance de la période précédente à la période actuelle.`}>
      {normalized.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={cn("w-6 rounded-t-sm bg-muted", getBarClass(trend, index, normalized.length))}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function getVariationClass(trend: TrendDirection) {
  if (trend === "up") return "text-emerald-700 dark:text-emerald-300";
  if (trend === "down") return "text-red-700 dark:text-red-300";
  return "text-muted-foreground";
}

function getBarClass(trend: TrendDirection, index: number, total: number) {
  const isLast = index === total - 1;
  if (!isLast) return "bg-muted";
  if (trend === "up") return "bg-emerald-500";
  if (trend === "down") return "bg-red-500";
  return "bg-slate-500";
}

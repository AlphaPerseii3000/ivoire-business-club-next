import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminMetricsCards } from "./admin-metrics-cards";
import type { AnalyticsMetric } from "@/lib/admin-analytics";

const metrics: AnalyticsMetric[] = [
  {
    id: "mrr",
    title: "MRR",
    value: "177,00 €",
    help: "Revenu mensuel des abonnements actifs",
    variation: 12,
    variationLabel: "+12 % vs période précédente",
    trend: "up",
    trendLabel: "Tendance en hausse",
    trendSeries: [120, 177],
  },
  {
    id: "activeMembers",
    title: "Membres actifs (7j)",
    value: "0",
    help: "Sessions actives suivies côté serveur uniquement",
    variation: 0,
    variationLabel: "Stable vs période précédente",
    trend: "stable",
    trendLabel: "Tendance stable",
    trendSeries: [0, 0],
  },
  {
    id: "conversion",
    title: "Conversion onboarding → signup",
    value: "50 %",
    help: "Proxy MVP basé sur les abonnements créés",
    variation: -5,
    variationLabel: "-5 % vs période précédente",
    trend: "down",
    trendLabel: "Tendance en baisse",
    trendSeries: [55, 50],
  },
  {
    id: "churn",
    title: "Churn mensuel",
    value: "0 %",
    help: "Résiliations des 30 derniers jours rapportées aux abonnements actifs",
    variation: 0,
    variationLabel: "Stable vs période précédente",
    trend: "stable",
    trendLabel: "Tendance stable",
    trendSeries: [0, 0],
  },
];

describe("AdminMetricsCards", () => {
  it("renders four French analytics cards with values, help and accessible trends", () => {
    render(<AdminMetricsCards metrics={metrics} />);

    expect(screen.getByRole("region", { name: "Métriques clés" })).toBeInTheDocument();
    expect(screen.getByText("MRR")).toBeInTheDocument();
    expect(screen.getByText("Membres actifs (7j)")).toBeInTheDocument();
    expect(screen.getByText("Conversion onboarding → signup")).toBeInTheDocument();
    expect(screen.getByText("Churn mensuel")).toBeInTheDocument();
    expect(screen.getByText("177,00 €")).toBeInTheDocument();
    expect(screen.getByText("Sessions actives suivies côté serveur uniquement")).toBeInTheDocument();
    expect(screen.getByText("Proxy MVP basé sur les abonnements créés")).toBeInTheDocument();
    expect(screen.getAllByText("Stable vs période précédente")).toHaveLength(2);
    expect(screen.getByLabelText("Tendance en hausse")).toBeInTheDocument();
    expect(screen.getByLabelText("Tendance en baisse")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /Mini-tendance/ })).toHaveLength(4);
  });
});

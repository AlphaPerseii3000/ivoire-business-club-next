# Edge Case Hunter Prompt — Story 2.5

You are an Edge Case Hunter. Review this unified diff with read access to the repository. Focus on edge cases, runtime failures, state mismatches, test fragility, and framework/version constraints. Output findings as Markdown bullets with evidence.

```diff
diff --git a/.env.example b/.env.example
index 9f79d1f..92e70f2 100644
--- a/.env.example
+++ b/.env.example
@@ -27,5 +27,8 @@ BANK_TRANSFER_IBAN=
 BANK_TRANSFER_BIC=
 BANK_TRANSFER_BANK_ADDRESS=
 
+# Support
+SUPPORT_WHATSAPP_NUMBER=
+
 # App
 APP_URL=
diff --git a/_bmad-output/implementation-artifacts/2-5-suivi-des-statuts-dabonnement-et-notifications.md b/_bmad-output/implementation-artifacts/2-5-suivi-des-statuts-dabonnement-et-notifications.md
index 9bdb352..b3e5132 100644
--- a/_bmad-output/implementation-artifacts/2-5-suivi-des-statuts-dabonnement-et-notifications.md
+++ b/_bmad-output/implementation-artifacts/2-5-suivi-des-statuts-dabonnement-et-notifications.md
@@ -2,7 +2,7 @@
 Story: "2.5"
 StoryKey: "2-5-suivi-des-statuts-dabonnement-et-notifications"
 Title: "Suivi des Statuts d'Abonnement et Notifications"
-Status: "ready-for-dev"
+Status: review
 Priority: "P0"
 Epic: "Epic 2 — Tiers et Paiement par Virement Bancaire"
 FRs: ["FR13", "FR14"]
@@ -12,7 +12,7 @@ Created: "2026-05-14"
 
 # Story 2.5: Suivi des Statuts d'Abonnement et Notifications
 
-Status: ready-for-dev
+Status: review
 
 <!-- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created. -->
 
diff --git a/_bmad-output/implementation-artifacts/sprint-status.yaml b/_bmad-output/implementation-artifacts/sprint-status.yaml
index f65ede6..f1350ed 100644
--- a/_bmad-output/implementation-artifacts/sprint-status.yaml
+++ b/_bmad-output/implementation-artifacts/sprint-status.yaml
@@ -35,7 +35,7 @@
 # - Dev moves story to 'review', then runs code-review (fresh context, different LLM recommended)
 
 generated: 2026-05-12T23:04:29Z
-last_updated: 2026-05-14T22:22:20+02:00
+last_updated: 2026-05-14T22:26:51+02:00
 project: ibc
 project_key: NOKEY
 tracking_system: file-system
@@ -58,7 +58,7 @@ development_status:
   2-2-affichage-et-comparaison-des-tiers: done
   2-3-selection-du-tier-et-instructions-de-virement: done
   2-4-validation-manuelle-des-abonnements-par-ladmin: done
-  2-5-suivi-des-statuts-dabonnement-et-notifications: ready-for-dev
+  2-5-suivi-des-statuts-dabonnement-et-notifications: review
   epic-2-retrospective: optional
   epic-3: backlog
   3-1-creation-et-soumission-dopportunite: backlog
diff --git a/src/app/(dashboard)/dashboard/page.tsx b/src/app/(dashboard)/dashboard/page.tsx
index 3dcd7b4..88ea5f3 100644
--- a/src/app/(dashboard)/dashboard/page.tsx
+++ b/src/app/(dashboard)/dashboard/page.tsx
@@ -3,6 +3,13 @@ import Link from "next/link";
 import { auth } from "@/lib/auth";
 import { prisma } from "@/lib/prisma";
 import { redirect } from "next/navigation";
+import { SubscriptionActivationNotice } from "@/components/subscription-activation-notice";
+
+const ACTIVATION_NOTICE_DAYS = 7;
+
+function isRecent(date: Date, days: number) {
+  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
+}
 
 export default async function DashboardPage() {
   const session = await auth();
@@ -24,17 +31,29 @@ export default async function DashboardPage() {
 
   const statusLabel: Record<string, string> = {
     TRIAL: "Essai",
+    PENDING: "En attente",
     ACTIVE: "Actif",
     PAST_DUE: "En retard",
     CANCELLED: "Annulé",
   };
+  const showActivationNotice = subscription?.status === "ACTIVE"
+    ? isRecent(subscription.updatedAt, ACTIVATION_NOTICE_DAYS)
+    : false;
 
   return (
     <div className="mx-auto max-w-4xl px-4 py-8">
       <h1 className="text-2xl font-bold">Bienvenue, {user.name}</h1>
       <p className="mt-1 text-muted-foreground">Ton tableau de bord Ivoire Business Club</p>
 
-      {/* Subscription card */}
+      {showActivationNotice && subscription ? (
+        <SubscriptionActivationNotice
+          className="mt-8"
+          subscriptionId={subscription.id}
+          tier={subscription.tier}
+          ctaHref="/opportunities"
+        />
+      ) : null}
+
       <div className="mt-8 rounded-xl border bg-card p-6">
         <h2 className="text-lg font-semibold">Mon abonnement</h2>
         <div className="mt-4 grid gap-4 sm:grid-cols-3">
@@ -59,17 +78,16 @@ export default async function DashboardPage() {
             </p>
           </div>
         </div>
-        {(!subscription || subscription.status === "TRIAL") && (
+        {!subscription || subscription.status === "TRIAL" ? (
           <Link
             href="/pricing"
-            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
+            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
           >
             Choisir un plan
           </Link>
-        )}
+        ) : null}
       </div>
 
-      {/* Quick actions */}
       <div className="mt-8 grid gap-4 sm:grid-cols-3">
         <Link href="/opportunities" className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
           <p className="text-lg font-semibold">🎯 Opportunités</p>
diff --git a/src/app/(dashboard)/opportunities/[id]/page.test.tsx b/src/app/(dashboard)/opportunities/[id]/page.test.tsx
new file mode 100644
index 0000000..321ce37
--- /dev/null
+++ b/src/app/(dashboard)/opportunities/[id]/page.test.tsx
@@ -0,0 +1,64 @@
+import React from "react";
+import { render, screen } from "@testing-library/react";
+import { beforeEach, describe, expect, it, vi } from "vitest";
+
+import OpportunityDetailPage from "./page";
+
+const mockAuth = vi.hoisted(() => vi.fn());
+const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
+const mockOpportunityFindUnique = vi.hoisted(() => vi.fn());
+const mockNotFound = vi.hoisted(() => vi.fn(() => { throw new Error("notFound"); }));
+
+vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
+vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
+vi.mock("@/lib/prisma", () => ({
+  prisma: {
+    opportunity: { findUnique: mockOpportunityFindUnique },
+  },
+}));
+vi.mock("next/navigation", () => ({
+  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
+  notFound: mockNotFound,
+}));
+
+const params = { params: Promise.resolve({ id: "opp-1" }) };
+
+describe("OpportunityDetailPage premium access gating", () => {
+  beforeEach(() => {
+    vi.clearAllMocks();
+    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
+  });
+
+  it("blocks premium deal details for non-active members", async () => {
+    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });
+    mockOpportunityFindUnique.mockResolvedValueOnce({ id: "opp-1" });
+
+    render(await OpportunityDetailPage(params));
+
+    expect(screen.getByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).toBeInTheDocument();
+    expect(screen.getByRole("link", { name: "Voir les offres" })).toHaveAttribute("href", "/pricing");
+    expect(screen.queryByText("Dossier confidentiel premium")).not.toBeInTheDocument();
+    expect(mockOpportunityFindUnique).toHaveBeenCalledWith({ where: { id: "opp-1" }, select: { id: true } });
+  });
+
+  it("renders premium deal details for active members", async () => {
+    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
+    mockOpportunityFindUnique.mockResolvedValueOnce({
+      id: "opp-1",
+      title: "Terrain à Cocody",
+      description: "Dossier confidentiel premium",
+      amount: 25000,
+      category: "IMMOBILIER",
+      verificationStatus: "VERIFIED",
+      createdAt: new Date("2026-05-14T00:00:00.000Z"),
+      author: { id: "author-1", name: "Koffi", location: "Abidjan" },
+      verifiedBy: { name: "Admin IBC" },
+    });
+
+    render(await OpportunityDetailPage(params));
+
+    expect(screen.getByText("Terrain à Cocody")).toBeInTheDocument();
+    expect(screen.getByText("Dossier confidentiel premium")).toBeInTheDocument();
+    expect(screen.queryByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).not.toBeInTheDocument();
+  });
+});
diff --git a/src/app/(dashboard)/opportunities/[id]/page.tsx b/src/app/(dashboard)/opportunities/[id]/page.tsx
index a4a2f56..2ca5aa7 100644
--- a/src/app/(dashboard)/opportunities/[id]/page.tsx
+++ b/src/app/(dashboard)/opportunities/[id]/page.tsx
@@ -3,12 +3,32 @@ import Link from "next/link";
 import { auth } from "@/lib/auth";
 import { prisma } from "@/lib/prisma";
 import { redirect, notFound } from "next/navigation";
+import { getUserPremiumAccess } from "@/lib/subscription-access";
+import { PremiumAccessBlockedPanel } from "@/components/premium-access-blocked-panel";
 
 export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
   const session = await auth();
   if (!session?.user?.id) redirect("/auth/signin");
   const { id } = await params;
 
+  const access = await getUserPremiumAccess(session.user.id);
+
+  if (!access.hasAccess) {
+    const exists = await prisma.opportunity.findUnique({
+      where: { id },
+      select: { id: true },
+    });
+
+    if (!exists) notFound();
+
+    return (
+      <div className="mx-auto max-w-3xl px-4 py-8">
+        <Link href="/opportunities" className="text-sm text-muted-foreground hover:text-primary">← Retour aux opportunités</Link>
+        <PremiumAccessBlockedPanel />
+      </div>
+    );
+  }
+
   const opportunity = await prisma.opportunity.findUnique({
     where: { id },
     include: {
@@ -46,11 +66,11 @@ export default async function OpportunityDetailPage({ params }: { params: Promis
 
         <div className="mt-4 flex gap-3">
           <span className="rounded-md bg-muted px-3 py-1 text-sm">{categoryLabels[opportunity.category] ?? opportunity.category}</span>
-          {opportunity.amount && (
+          {opportunity.amount ? (
             <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
               {opportunity.amount.toLocaleString("fr-FR")} €
             </span>
-          )}
+          ) : null}
         </div>
 
         <div className="mt-6 rounded-xl border bg-card p-6">
@@ -61,20 +81,20 @@ export default async function OpportunityDetailPage({ params }: { params: Promis
           <h2 className="font-semibold">Auteur</h2>
           <p className="mt-1 text-sm">{opportunity.author.name}{opportunity.author.location ? ` — ${opportunity.author.location}` : ""}</p>
           <p className="mt-1 text-xs text-muted-foreground">Publié le {new Date(opportunity.createdAt).toLocaleDateString("fr-FR")}</p>
-          {opportunity.verifiedBy && (
+          {opportunity.verifiedBy ? (
             <p className="mt-2 text-xs text-accent">Vérifié par {opportunity.verifiedBy.name}</p>
-          )}
+          ) : null}
         </div>
 
-        {session.user.id === opportunity.author.id && (
+        {session.user.id === opportunity.author.id ? (
           <div className="mt-6">
             <form action={`/api/opportunities/${opportunity.id}/delete`} method="POST">
-              <button type="submit" className="rounded-md border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
+              <button type="submit" className="min-h-11 rounded-md border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                 Supprimer cette opportunité
               </button>
             </form>
           </div>
-        )}
+        ) : null}
       </div>
     </div>
   );
diff --git a/src/app/(dashboard)/opportunities/page.test.tsx b/src/app/(dashboard)/opportunities/page.test.tsx
new file mode 100644
index 0000000..d1dc478
--- /dev/null
+++ b/src/app/(dashboard)/opportunities/page.test.tsx
@@ -0,0 +1,60 @@
+import React from "react";
+import { render, screen } from "@testing-library/react";
+import { beforeEach, describe, expect, it, vi } from "vitest";
+
+import OpportunitiesPage from "./page";
+
+const mockAuth = vi.hoisted(() => vi.fn());
+const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
+const mockOpportunityFindMany = vi.hoisted(() => vi.fn());
+
+vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
+vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
+vi.mock("@/lib/prisma", () => ({
+  prisma: {
+    opportunity: { findMany: mockOpportunityFindMany },
+  },
+}));
+vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
+
+describe("OpportunitiesPage premium access gating", () => {
+  beforeEach(() => {
+    vi.clearAllMocks();
+    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
+  });
+
+  it.each(["TRIAL", "PENDING", "CANCELLED", "PAST_DUE", "NO_SUBSCRIPTION"])(
+    "blocks premium content for %s members through the subscription-access helper",
+    async () => {
+      mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });
+
+      render(await OpportunitiesPage());
+
+      expect(screen.getByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).toBeInTheDocument();
+      expect(screen.getByRole("link", { name: "Voir les offres" })).toHaveAttribute("href", "/pricing");
+      expect(mockOpportunityFindMany).not.toHaveBeenCalled();
+    }
+  );
+
+  it("renders premium opportunity content for active members", async () => {
+    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
+    mockOpportunityFindMany.mockResolvedValue([
+      {
+        id: "opp-1",
+        title: "Terrain à Cocody",
+        description: "Dossier complet et rendement estimé.",
+        amount: 25000,
+        category: "IMMOBILIER",
+        verificationStatus: "VERIFIED",
+        createdAt: new Date("2026-05-14T00:00:00.000Z"),
+        author: { id: "author-1", name: "Koffi" },
+      },
+    ]);
+
+    render(await OpportunitiesPage());
+
+    expect(screen.getByText("Terrain à Cocody")).toBeInTheDocument();
+    expect(screen.getByText("Dossier complet et rendement estimé.")).toBeInTheDocument();
+    expect(screen.queryByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).not.toBeInTheDocument();
+  });
+});
diff --git a/src/app/(dashboard)/opportunities/page.tsx b/src/app/(dashboard)/opportunities/page.tsx
index dc95140..88df04f 100644
--- a/src/app/(dashboard)/opportunities/page.tsx
+++ b/src/app/(dashboard)/opportunities/page.tsx
@@ -1,15 +1,16 @@
+import Link from "next/link";
+
 import { auth } from "@/lib/auth";
 import { prisma } from "@/lib/prisma";
 import { redirect } from "next/navigation";
+import { getUserPremiumAccess } from "@/lib/subscription-access";
+import { PremiumAccessBlockedPanel } from "@/components/premium-access-blocked-panel";
 
 export default async function OpportunitiesPage() {
   const session = await auth();
   if (!session?.user?.id) redirect("/auth/signin");
 
-  const opportunities = await prisma.opportunity.findMany({
-    orderBy: { createdAt: "desc" },
-    include: { author: { select: { name: true, id: true } } },
-  });
+  const access = await getUserPremiumAccess(session.user.id);
 
   const categoryLabels: Record<string, string> = {
     INVESTISSEMENT: "Investissement",
@@ -24,6 +25,33 @@ export default async function OpportunitiesPage() {
     REJECTED: "❌ Refusé",
   };
 
+  if (!access.hasAccess) {
+    return (
+      <div className="mx-auto max-w-4xl px-4 py-8">
+        <div className="flex items-center justify-between">
+          <div>
+            <h1 className="text-2xl font-bold">Opportunités</h1>
+            <p className="mt-1 text-muted-foreground">
+              Découvre des opportunités business en Afrique
+            </p>
+          </div>
+          <Link
+            href="/opportunities/new"
+            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
+          >
+            + Publier
+          </Link>
+        </div>
+        <PremiumAccessBlockedPanel />
+      </div>
+    );
+  }
+
+  const opportunities = await prisma.opportunity.findMany({
+    orderBy: { createdAt: "desc" },
+    include: { author: { select: { name: true, id: true } } },
+  });
+
   return (
     <div className="mx-auto max-w-4xl px-4 py-8">
       <div className="flex items-center justify-between">
@@ -33,12 +61,12 @@ export default async function OpportunitiesPage() {
             Découvre des opportunités business en Afrique
           </p>
         </div>
-        <a
+        <Link
           href="/opportunities/new"
-          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
+          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
         >
           + Publier
-        </a>
+        </Link>
       </div>
 
       {opportunities.length === 0 ? (
@@ -59,11 +87,11 @@ export default async function OpportunitiesPage() {
                   <h3 className="text-lg font-semibold">{opp.title}</h3>
                   <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{opp.description}</p>
                 </div>
-                {opp.amount && (
+                {opp.amount ? (
                   <span className="ml-4 rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary whitespace-nowrap">
                     {opp.amount.toLocaleString("fr-FR")} €
                   </span>
-                )}
+                ) : null}
               </div>
               <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                 <span className="rounded-md bg-muted px-2 py-1">{categoryLabels[opp.category] ?? opp.category}</span>
diff --git a/src/app/(dashboard)/profile/page.test.tsx b/src/app/(dashboard)/profile/page.test.tsx
new file mode 100644
index 0000000..015a994
--- /dev/null
+++ b/src/app/(dashboard)/profile/page.test.tsx
@@ -0,0 +1,102 @@
+import React from "react";
+import { render, screen } from "@testing-library/react";
+import { beforeEach, describe, expect, it, vi } from "vitest";
+
+import ProfilePage from "./page";
+
+const mockAuth = vi.hoisted(() => vi.fn());
+const mockUserFindUnique = vi.hoisted(() => vi.fn());
+
+vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
+vi.mock("@/lib/prisma", () => ({
+  prisma: {
+    user: { findUnique: mockUserFindUnique },
+  },
+}));
+vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
+vi.mock("@/components/features/auth/avatar-upload", () => ({ default: () => <div data-testid="avatar-upload" /> }));
+vi.mock("@/components/features/auth/profile-edit-form", () => ({ default: () => <div data-testid="profile-edit-form" /> }));
+vi.mock("@/components/subscription-activation-notice", () => ({
+  SubscriptionActivationNotice: ({ tier }: { tier: string }) => <div>Activation {tier}</div>,
+}));
+
+const baseUser = {
+  id: "user-1",
+  name: "Awa Traoré",
+  email: "awa@example.com",
+  bio: null,
+  image: null,
+  phone: null,
+  location: null,
+  country: null,
+  tier: "GRAND_FRERE",
+  role: "MEMBER",
+  verificationStatus: "PENDING",
+  createdAt: new Date("2026-05-01T00:00:00.000Z"),
+};
+
+describe("ProfilePage subscription status", () => {
+  beforeEach(() => {
+    vi.clearAllMocks();
+    vi.setSystemTime(new Date("2026-05-14T12:00:00.000Z"));
+    process.env.SUPPORT_WHATSAPP_NUMBER = "2250700000000";
+    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
+  });
+
+  it("renders the latest pending subscription tracker and WhatsApp support CTA after 24h", async () => {
+    mockUserFindUnique.mockResolvedValue({
+      ...baseUser,
+      subscriptions: [
+        {
+          id: "sub-1",
+          tier: "GRAND_FRERE",
+          status: "PENDING",
+          providerRef: "IBC-user-1-GRAND_FRERE",
+          createdAt: new Date("2026-05-13T08:00:00.000Z"),
+          updatedAt: new Date("2026-05-13T08:00:00.000Z"),
+          endDate: null,
+        },
+      ],
+    });
+
+    render(await ProfilePage());
+
+    expect(screen.getByText("Virement en cours de validation")).toBeInTheDocument();
+    expect(screen.getByText("En attente")).toBeInTheDocument();
+    const supportLink = screen.getByRole("link", { name: "Contacter le support" });
+    expect(supportLink).toHaveAttribute("target", "_blank");
+    expect(supportLink).toHaveAttribute("href", expect.stringContaining("https://wa.me/2250700000000"));
+    expect(supportLink).toHaveAttribute("href", expect.stringContaining("IBC-user-1-GRAND_FRERE"));
+    expect(screen.getByTestId("profile-edit-form")).toBeInTheDocument();
+  });
+
+  it("does not show support CTA before the 24h threshold", async () => {
+    mockUserFindUnique.mockResolvedValue({
+      ...baseUser,
+      subscriptions: [
+        {
+          id: "sub-2",
+          tier: "AFFRANCHI",
+          status: "PENDING",
+          providerRef: "IBC-user-1-AFFRANCHI",
+          createdAt: new Date("2026-05-14T00:00:00.000Z"),
+          updatedAt: new Date("2026-05-14T00:00:00.000Z"),
+          endDate: null,
+        },
+      ],
+    });
+
+    render(await ProfilePage());
+
+    expect(screen.queryByRole("link", { name: "Contacter le support" })).not.toBeInTheDocument();
+  });
+
+  it("renders a pricing CTA when no subscription exists", async () => {
+    mockUserFindUnique.mockResolvedValue({ ...baseUser, subscriptions: [] });
+
+    render(await ProfilePage());
+
+    expect(screen.getByText("Aucun abonnement pour le moment")).toBeInTheDocument();
+    expect(screen.getByRole("link", { name: "Voir les offres" })).toHaveAttribute("href", "/pricing");
+  });
+});
diff --git a/src/app/(dashboard)/profile/page.tsx b/src/app/(dashboard)/profile/page.tsx
index 86deeed..2aa2c88 100644
--- a/src/app/(dashboard)/profile/page.tsx
+++ b/src/app/(dashboard)/profile/page.tsx
@@ -1,3 +1,4 @@
+import Link from "next/link";
 import { auth } from "@/lib/auth";
 import { prisma } from "@/lib/prisma";
 import { redirect } from "next/navigation";
@@ -6,8 +7,51 @@ import { Badge } from "@/components/ui/badge";
 import { Separator } from "@/components/ui/separator";
 import AvatarUpload from "@/components/features/auth/avatar-upload";
 import ProfileEditForm from "@/components/features/auth/profile-edit-form";
+import SubscriptionStatusTracker from "@/components/subscription-status-tracker";
+import { SubscriptionActivationNotice } from "@/components/subscription-activation-notice";
+import { buildWhatsAppSupportLink } from "@/lib/whatsapp";
 import { getTierBadgeConfig } from "@/lib/tier-config";
 
+const SUPPORT_EMAIL = "support@ivoirebusinessclub.com";
+const SUPPORT_THRESHOLD_HOURS = 24;
+const ACTIVATION_NOTICE_DAYS = 7;
+
+const subscriptionStatusCopy: Record<string, { title: string; description: string }> = {
+  TRIAL: {
+    title: "Virement à effectuer",
+    description: "Ton compte est prêt. Suis les instructions de virement pour lancer la validation.",
+  },
+  PENDING: {
+    title: "Virement en cours de validation",
+    description: "Nous validons votre virement sous 24h. Merci de votre patience.",
+  },
+  ACTIVE: {
+    title: "Abonnement actif",
+    description: "Ton accès premium est ouvert. Tu peux consulter les deals vérifiés.",
+  },
+  CANCELLED: {
+    title: "Abonnement annulé",
+    description: "Votre abonnement n'est plus actif. Renouvelez pour accéder aux deals premium.",
+  },
+  PAST_DUE: {
+    title: "Paiement à régulariser",
+    description: "Ton accès premium est suspendu jusqu'à régularisation.",
+  },
+};
+
+function isOlderThanHours(date: Date, hours: number) {
+  return Date.now() - date.getTime() >= hours * 60 * 60 * 1000;
+}
+
+function isRecent(date: Date, days: number) {
+  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
+}
+
+function buildSupportMessage(providerRef?: string | null) {
+  const referenceLine = providerRef ? ` Ma référence d'abonnement est ${providerRef}.` : "";
+  return `Bonjour IBC, mon virement est en attente de validation depuis plus de 24h.${referenceLine} Pouvez-vous m'aider s'il vous plaît ?`;
+}
+
 export default async function ProfilePage() {
   const session = await auth();
   if (!session?.user?.id) redirect("/auth/signin");
@@ -27,16 +71,46 @@ export default async function ProfilePage() {
       role: true,
       verificationStatus: true,
       createdAt: true,
+      subscriptions: {
+        orderBy: { createdAt: "desc" },
+        take: 1,
+        select: {
+          id: true,
+          tier: true,
+          status: true,
+          providerRef: true,
+          createdAt: true,
+          updatedAt: true,
+          endDate: true,
+        },
+      },
     },
   });
 
   if (!user) redirect("/auth/signin");
 
+  const latestSubscription = user.subscriptions[0] ?? null;
   const tierInfo = getTierBadgeConfig(user.tier);
   const formattedDate = user.createdAt.toLocaleDateString("fr-FR", {
     year: "numeric",
     month: "long",
   });
+  const supportNumber = process.env.SUPPORT_WHATSAPP_NUMBER ?? process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
+  const supportLink = latestSubscription?.status === "PENDING"
+    ? buildWhatsAppSupportLink({
+        phoneNumber: supportNumber,
+        message: buildSupportMessage(latestSubscription.providerRef),
+      })
+    : null;
+  const showSupportCta = latestSubscription?.status === "PENDING"
+    ? isOlderThanHours(latestSubscription.createdAt, SUPPORT_THRESHOLD_HOURS)
+    : false;
+  const showActivationNotice = latestSubscription?.status === "ACTIVE"
+    ? isRecent(latestSubscription.updatedAt, ACTIVATION_NOTICE_DAYS)
+    : false;
+  const statusCopy = latestSubscription
+    ? subscriptionStatusCopy[latestSubscription.status] ?? subscriptionStatusCopy.TRIAL
+    : null;
 
   return (
     <div className="mx-auto max-w-2xl px-4 py-8">
@@ -45,7 +119,15 @@ export default async function ProfilePage() {
         Gère tes informations personnelles
       </p>
 
-      {/* Profile header card */}
+      {showActivationNotice && latestSubscription ? (
+        <SubscriptionActivationNotice
+          className="mt-6"
+          subscriptionId={latestSubscription.id}
+          tier={latestSubscription.tier}
+          ctaHref="/opportunities"
+        />
+      ) : null}
+
       <Card className="mt-6">
         <CardHeader className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
           <AvatarUpload
@@ -74,9 +156,65 @@ export default async function ProfilePage() {
         </CardHeader>
       </Card>
 
+      <Card className="mt-6">
+        <CardHeader>
+          <CardTitle>Mon abonnement</CardTitle>
+          <CardDescription>
+            Suis l&apos;avancement de ton abonnement IBC.
+          </CardDescription>
+        </CardHeader>
+        <CardContent>
+          {latestSubscription ? (
+            <div className="space-y-5">
+              <div>
+                <Badge variant="outline" className={getTierBadgeConfig(latestSubscription.tier).className}>
+                  {getTierBadgeConfig(latestSubscription.tier).label}
+                </Badge>
+                <h2 className="mt-3 text-lg font-semibold">{statusCopy?.title}</h2>
+                <p className="mt-1 text-sm text-muted-foreground">{statusCopy?.description}</p>
+              </div>
+              <SubscriptionStatusTracker
+                status={latestSubscription.status}
+                submittedAt={latestSubscription.createdAt}
+                validatedAt={latestSubscription.status === "ACTIVE" ? latestSubscription.updatedAt : null}
+                cancelledAt={latestSubscription.status === "CANCELLED" || latestSubscription.status === "PAST_DUE" ? latestSubscription.updatedAt : null}
+              />
+              {showSupportCta ? (
+                supportLink ? (
+                  <a
+                    href={supportLink}
+                    target="_blank"
+                    rel="noreferrer"
+                    className="inline-flex min-h-11 items-center rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
+                  >
+                    Contacter le support
+                  </a>
+                ) : (
+                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
+                    Le support WhatsApp n&apos;est pas encore configuré. Écris-nous à {SUPPORT_EMAIL} avec ta référence {latestSubscription.providerRef ?? "IBC"}.
+                  </div>
+                )
+              ) : null}
+            </div>
+          ) : (
+            <div className="rounded-lg border border-dashed p-5 text-sm">
+              <p className="font-medium">Aucun abonnement pour le moment</p>
+              <p className="mt-1 text-muted-foreground">
+                Choisis un tier pour rejoindre le club et accéder aux deals premium.
+              </p>
+              <Link
+                href="/pricing"
+                className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
+              >
+                Voir les offres
+              </Link>
+            </div>
+          )}
+        </CardContent>
+      </Card>
+
       <Separator className="my-6" />
 
-      {/* Edit form */}
       <Card>
         <CardContent className="pt-6">
           <ProfileEditForm user={user} />
diff --git a/src/components/premium-access-blocked-panel.tsx b/src/components/premium-access-blocked-panel.tsx
new file mode 100644
index 0000000..f5cc35b
--- /dev/null
+++ b/src/components/premium-access-blocked-panel.tsx
@@ -0,0 +1,21 @@
+import Link from "next/link";
+
+export function PremiumAccessBlockedPanel() {
+  return (
+    <section
+      aria-label="Accès premium bloqué"
+      className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
+    >
+      <h2 className="text-lg font-semibold">Accès réservé aux membres actifs</h2>
+      <p className="mt-2 text-sm">
+        Votre abonnement est inactif. Renouvelez pour accéder aux deals.
+      </p>
+      <Link
+        href="/pricing"
+        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
+      >
+        Voir les offres
+      </Link>
+    </section>
+  );
+}
diff --git a/src/components/subscription-activation-notice.test.tsx b/src/components/subscription-activation-notice.test.tsx
new file mode 100644
index 0000000..6205944
--- /dev/null
+++ b/src/components/subscription-activation-notice.test.tsx
@@ -0,0 +1,32 @@
+import { render, screen, waitFor } from "@testing-library/react";
+import userEvent from "@testing-library/user-event";
+import { beforeEach, describe, expect, it } from "vitest";
+
+import { SubscriptionActivationNotice } from "./subscription-activation-notice";
+
+describe("SubscriptionActivationNotice", () => {
+  beforeEach(() => {
+    window.localStorage.clear();
+  });
+
+  it("renders French activation celebration with tier badge and deals CTA", async () => {
+    render(<SubscriptionActivationNotice subscriptionId="sub-1" tier="BOSS" />);
+
+    expect(await screen.findByText("Bienvenue dans le club IBC !")).toBeInTheDocument();
+    expect(screen.getByText("Boss")).toBeInTheDocument();
+    expect(screen.getByRole("link", { name: "Découvrir les deals" })).toHaveAttribute("href", "/opportunities");
+  });
+
+  it("persists dismissal in localStorage by subscription id", async () => {
+    const user = userEvent.setup();
+    render(<SubscriptionActivationNotice subscriptionId="sub-dismiss" tier="AFFRANCHI" />);
+
+    await screen.findByText("Bienvenue dans le club IBC !");
+    await user.click(screen.getByRole("button", { name: "Masquer" }));
+
+    await waitFor(() => {
+      expect(screen.queryByText("Bienvenue dans le club IBC !")).not.toBeInTheDocument();
+    });
+    expect(window.localStorage.getItem("ibc:subscription-activation-notice:sub-dismiss")).toBe("dismissed");
+  });
+});
diff --git a/src/components/subscription-activation-notice.tsx b/src/components/subscription-activation-notice.tsx
new file mode 100644
index 0000000..1bb5b79
--- /dev/null
+++ b/src/components/subscription-activation-notice.tsx
@@ -0,0 +1,82 @@
+"use client";
+
+import { useState } from "react";
+import Link from "next/link";
+
+import { Badge } from "@/components/ui/badge";
+import { getTierBadgeConfig } from "@/lib/tier-config";
+import { cn } from "@/lib/utils";
+
+type SubscriptionActivationNoticeProps = {
+  subscriptionId: string;
+  tier: string;
+  ctaHref?: string;
+  className?: string;
+};
+
+export function SubscriptionActivationNotice({
+  subscriptionId,
+  tier,
+  ctaHref = "/opportunities",
+  className,
+}: SubscriptionActivationNoticeProps) {
+  const storageKey = `ibc:subscription-activation-notice:${subscriptionId}`;
+  const [isDismissed, setIsDismissed] = useState(() =>
+    typeof window === "undefined"
+      ? true
+      : window.localStorage.getItem(storageKey) === "dismissed"
+  );
+  const tierBadge = getTierBadgeConfig(tier);
+
+  function dismiss() {
+    window.localStorage.setItem(storageKey, "dismissed");
+    setIsDismissed(true);
+  }
+
+  if (isDismissed) {
+    return null;
+  }
+
+  return (
+    <section
+      aria-label="Notification d'activation d'abonnement"
+      className={cn(
+        "rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm dark:border-teal-900 dark:bg-teal-950/50",
+        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-reduce:animate-none",
+        className
+      )}
+    >
+      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
+        <div>
+          <div className="flex flex-wrap items-center gap-2">
+            <span className="text-2xl" aria-hidden="true">🎉</span>
+            <h2 className="text-lg font-semibold text-teal-950 dark:text-teal-50">
+              Bienvenue dans le club IBC !
+            </h2>
+            <Badge variant="outline" className={tierBadge.className}>
+              {tierBadge.label}
+            </Badge>
+          </div>
+          <p className="mt-2 text-sm text-teal-900 dark:text-teal-100">
+            Ton abonnement est activé. Tu peux maintenant accéder aux deals premium et découvrir les opportunités vérifiées.
+          </p>
+          <div className="mt-4 flex flex-wrap gap-3">
+            <Link
+              href={ctaHref}
+              className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
+            >
+              Découvrir les deals
+            </Link>
+            <button
+              type="button"
+              onClick={dismiss}
+              className="inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
+            >
+              Masquer
+            </button>
+          </div>
+        </div>
+      </div>
+    </section>
+  );
+}
diff --git a/src/components/subscription-status-tracker.test.tsx b/src/components/subscription-status-tracker.test.tsx
new file mode 100644
index 0000000..f3adee4
--- /dev/null
+++ b/src/components/subscription-status-tracker.test.tsx
@@ -0,0 +1,48 @@
+import { render, screen } from "@testing-library/react";
+import { describe, expect, it } from "vitest";
+
+import SubscriptionStatusTracker from "./subscription-status-tracker";
+
+describe("SubscriptionStatusTracker", () => {
+  it("renders timestamps and pending current state for the bank-transfer lifecycle", () => {
+    render(
+      <SubscriptionStatusTracker
+        status="PENDING"
+        submittedAt={new Date(2026, 4, 14, 10, 30)}
+      />
+    );
+
+    expect(screen.getByText("Essai")).toBeInTheDocument();
+    expect(screen.getByText("En attente")).toBeInTheDocument();
+    expect(screen.getByText("Actif")).toBeInTheDocument();
+    expect(screen.getByText("Paiement par virement en cours")).toBeInTheDocument();
+    expect(screen.getAllByText(/14 mai 2026/).length).toBeGreaterThan(0);
+  });
+
+  it("renders active completion timestamp", () => {
+    render(
+      <SubscriptionStatusTracker
+        status="ACTIVE"
+        submittedAt={new Date(2026, 4, 13, 9, 0)}
+        validatedAt={new Date(2026, 4, 14, 11, 15)}
+      />
+    );
+
+    expect(screen.getByText("Abonnement confirmé")).toBeInTheDocument();
+    expect(screen.getByText(/14 mai 2026/)).toBeInTheDocument();
+  });
+
+  it("renders invalid subscription explanatory copy without hiding lifecycle", () => {
+    render(
+      <SubscriptionStatusTracker
+        status="CANCELLED"
+        cancelledAt={new Date(2026, 4, 15, 8, 0)}
+      />
+    );
+
+    expect(screen.getByText("Abonnement annulé")).toBeInTheDocument();
+    expect(screen.getByText(/Votre abonnement n'est plus actif/)).toBeInTheDocument();
+    expect(screen.getByText("Essai")).toBeInTheDocument();
+    expect(screen.getByText("Actif")).toBeInTheDocument();
+  });
+});
diff --git a/src/components/subscription-status-tracker.tsx b/src/components/subscription-status-tracker.tsx
index 9a8ba87..e558e15 100644
--- a/src/components/subscription-status-tracker.tsx
+++ b/src/components/subscription-status-tracker.tsx
@@ -10,7 +10,7 @@ export type SubscriptionStatus =
   | "CANCELLED";
 
 interface Step {
-  key: SubscriptionStatus;
+  key: "TRIAL" | "PENDING" | "ACTIVE";
   label: string;
   description: string;
 }
@@ -19,7 +19,7 @@ const STEPS: Step[] = [
   {
     key: "TRIAL",
     label: "Essai",
-    description: "Période d'essai activée",
+    description: "Compte prêt pour le virement",
   },
   {
     key: "PENDING",
@@ -33,27 +33,100 @@ const STEPS: Step[] = [
   },
 ];
 
+const INVALID_STATUS_COPY: Partial<Record<SubscriptionStatus, { title: string; description: string }>> = {
+  CANCELLED: {
+    title: "Abonnement annulé",
+    description: "Votre abonnement n'est plus actif. Renouvelez votre accès pour consulter les deals premium.",
+  },
+  PAST_DUE: {
+    title: "Paiement en retard",
+    description: "Votre abonnement demande une régularisation avant de réactiver l'accès premium.",
+  },
+};
+
+type StepTimestamps = Partial<Record<"TRIAL" | "PENDING" | "ACTIVE", Date | string | null | undefined>>;
+
 interface SubscriptionStatusTrackerProps {
   status: SubscriptionStatus;
   className?: string;
+  submittedAt?: Date | string | null;
+  validatedAt?: Date | string | null;
+  cancelledAt?: Date | string | null;
+  stepTimestamps?: StepTimestamps;
+}
+
+function formatTimestamp(value?: Date | string | null) {
+  if (!value) {
+    return null;
+  }
+
+  const date = value instanceof Date ? value : new Date(value);
+  if (Number.isNaN(date.getTime())) {
+    return null;
+  }
+
+  return date.toLocaleDateString("fr-FR", {
+    day: "2-digit",
+    month: "long",
+    year: "numeric",
+    hour: "2-digit",
+    minute: "2-digit",
+  });
+}
+
+function getActiveIndex(status: SubscriptionStatus) {
+  if (status === "ACTIVE") {
+    return 2;
+  }
+
+  if (status === "PENDING") {
+    return 1;
+  }
+
+  if (status === "TRIAL") {
+    return 0;
+  }
+
+  return -1;
 }
 
 export default function SubscriptionStatusTracker({
   status,
   className,
+  submittedAt,
+  validatedAt,
+  cancelledAt,
+  stepTimestamps,
 }: SubscriptionStatusTrackerProps) {
-  const activeIndex = STEPS.findIndex((s) => s.key === status);
+  const activeIndex = getActiveIndex(status);
+  const invalidCopy = INVALID_STATUS_COPY[status];
+  const timestamps: StepTimestamps = {
+    TRIAL: stepTimestamps?.TRIAL ?? submittedAt,
+    PENDING: stepTimestamps?.PENDING ?? submittedAt,
+    ACTIVE: stepTimestamps?.ACTIVE ?? validatedAt,
+  };
+  const invalidTimestamp = formatTimestamp(cancelledAt);
 
   return (
     <div className={cn("w-full max-w-sm", className)}>
-      <ol className="relative flex flex-col gap-6 pl-4">
+      {invalidCopy ? (
+        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
+          <p className="font-medium text-destructive">{invalidCopy.title}</p>
+          <p className="mt-1 text-muted-foreground">{invalidCopy.description}</p>
+          {invalidTimestamp ? (
+            <p className="mt-2 text-xs text-muted-foreground">Mis à jour le {invalidTimestamp}</p>
+          ) : null}
+        </div>
+      ) : null}
+
+      <ol className="relative flex flex-col gap-6 pl-4" aria-label="Cycle de vie de l'abonnement">
         {STEPS.map((step, index) => {
-          const isCompleted = index < activeIndex;
-          const isCurrent = index === activeIndex;
+          const isCompleted = activeIndex >= 0 && index < activeIndex;
+          const isCurrent = activeIndex >= 0 && index === activeIndex;
+          const stepTimestamp = formatTimestamp(timestamps[step.key]);
 
           return (
             <li key={step.key} className="flex items-start gap-4">
-              {/* Step dot / line */}
               <div className="flex flex-col items-center">
                 <div
                   className={cn(
@@ -76,6 +149,7 @@ export default function SubscriptionStatusTracker({
                       strokeWidth="2.5"
                       strokeLinecap="round"
                       strokeLinejoin="round"
+                      aria-hidden="true"
                     >
                       <polyline points="20 6 9 17 4 12" />
                     </svg>
@@ -95,7 +169,6 @@ export default function SubscriptionStatusTracker({
                 ) : null}
               </div>
 
-              {/* Text */}
               <div className="flex flex-col pt-0.5">
                 <span
                   className={cn(
@@ -109,12 +182,17 @@ export default function SubscriptionStatusTracker({
                 >
                   {step.label}
                   {isCurrent && status === "PENDING" ? (
-                    <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse dark:bg-amber-400" />
+                    <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-amber-500 motion-safe:animate-pulse motion-reduce:animate-none dark:bg-amber-400" />
                   ) : null}
                 </span>
                 <span className="text-xs text-muted-foreground">
                   {step.description}
                 </span>
+                {stepTimestamp ? (
+                  <time className="mt-1 text-xs text-muted-foreground" dateTime={new Date(timestamps[step.key] as string | Date).toISOString()}>
+                    {stepTimestamp}
+                  </time>
+                ) : null}
               </div>
             </li>
           );
diff --git a/src/lib/email.test.ts b/src/lib/email.test.ts
new file mode 100644
index 0000000..6d438c7
--- /dev/null
+++ b/src/lib/email.test.ts
@@ -0,0 +1,37 @@
+import { beforeEach, describe, expect, it, vi } from "vitest";
+
+const mockSend = vi.hoisted(() => vi.fn());
+
+vi.mock("resend", () => ({
+  Resend: vi.fn(function ResendMock() {
+    return { emails: { send: mockSend } };
+  }),
+}));
+
+describe("email helpers", () => {
+  beforeEach(() => {
+    vi.resetModules();
+    vi.clearAllMocks();
+    process.env.RESEND_API_KEY = "test-key";
+    process.env.RESEND_FROM_EMAIL = "IBC <noreply@example.com>";
+    delete process.env.APP_URL;
+  });
+
+  it("sends the exact French subscription activation copy once through the Resend wrapper", async () => {
+    const { sendSubscriptionActivatedEmail } = await import("./email");
+
+    await sendSubscriptionActivatedEmail({
+      to: "member@example.com",
+      name: "Awa",
+      tier: "GRAND_FRERE",
+    });
+
+    expect(mockSend).toHaveBeenCalledTimes(1);
+    expect(mockSend).toHaveBeenCalledWith({
+      from: "IBC <noreply@example.com>",
+      to: "member@example.com",
+      subject: "Votre abonnement IBC est activé",
+      text: expect.stringContaining("Votre abonnement IBC Grands Frères est activé. Bienvenue dans le club !"),
+    });
+  });
+});
diff --git a/src/lib/whatsapp.test.ts b/src/lib/whatsapp.test.ts
new file mode 100644
index 0000000..d07bdd7
--- /dev/null
+++ b/src/lib/whatsapp.test.ts
@@ -0,0 +1,20 @@
+import { describe, expect, it } from "vitest";
+
+import { buildWhatsAppSupportLink, normalizeWhatsAppNumber } from "./whatsapp";
+
+describe("whatsapp helpers", () => {
+  it("normalizes phone numbers and encodes support messages safely", () => {
+    expect(normalizeWhatsAppNumber("+225 07 00 00 00 00")).toBe("2250700000000");
+
+    const link = buildWhatsAppSupportLink({
+      phoneNumber: "+225 07 00 00 00 00",
+      message: "Bonjour IBC, référence IBC-user-GRAND_FRERE",
+    });
+
+    expect(link).toBe("https://wa.me/2250700000000?text=Bonjour%20IBC%2C%20r%C3%A9f%C3%A9rence%20IBC-user-GRAND_FRERE");
+  });
+
+  it("returns null when no usable number is configured", () => {
+    expect(buildWhatsAppSupportLink({ phoneNumber: "", message: "Bonjour" })).toBeNull();
+  });
+});
diff --git a/src/lib/whatsapp.ts b/src/lib/whatsapp.ts
new file mode 100644
index 0000000..5a5f85b
--- /dev/null
+++ b/src/lib/whatsapp.ts
@@ -0,0 +1,24 @@
+export function normalizeWhatsAppNumber(number: string): string {
+  return number.replace(/[^\d]/g, "");
+}
+
+type BuildWhatsAppSupportLinkInput = {
+  phoneNumber?: string | null;
+  message: string;
+};
+
+export function buildWhatsAppSupportLink({
+  phoneNumber,
+  message,
+}: BuildWhatsAppSupportLinkInput): string | null {
+  if (!phoneNumber?.trim()) {
+    return null;
+  }
+
+  const normalized = normalizeWhatsAppNumber(phoneNumber);
+  if (!normalized) {
+    return null;
+  }
+
+  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
+}

```

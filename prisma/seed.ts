import { prisma } from "../src/lib/prisma";
import { ArticleVisibility, UserRole, Tier, SubscriptionStatus } from "../src/generated/prisma/client";

export async function main() {
  if (process.env.NODE_ENV === "production") {
    console.log("Seeding skipped in production environment.");
    return;
  }
  console.log("Starting seed...");

  const hash = "$2b$10$W1QRKtFhSt/9bSdJgpGnH.aXCR2Bs6UBti8N3pbBIW1g1bEGfLXtG"; // hash for 'change-me'

  // 1. Create or upsert a default admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@ivoire-business-club.com" },
    update: {
      role: UserRole.ADMIN,
    },
    create: {
      email: "admin@ivoire-business-club.com",
      name: "Admin IBC",
      role: UserRole.ADMIN,
      passwordHash: hash,
    },
  });

  console.log("Admin user created/found:", admin.email);

  // 2. Create E2E test users with active subscriptions
  const e2eUsers = [
    { email: "member-affranchi@test.com", name: "Affranchi Member", tier: Tier.AFFRANCHI },
    { email: "member-grandfrere@test.com", name: "Grand Frere Member", tier: Tier.GRAND_FRERE },
    { email: "member-boss@test.com", name: "Boss Member", tier: Tier.BOSS },
  ];

  for (const user of e2eUsers) {
    const dbUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        tier: user.tier,
      },
      create: {
        email: user.email,
        name: user.name,
        role: UserRole.MEMBER,
        passwordHash: hash,
        tier: user.tier,
      },
    });

    console.log(`User created/found: ${dbUser.email} (tier: ${dbUser.tier})`);

    // Add active subscription
    await prisma.subscription.upsert({
      where: { id: `sub-${user.tier.toLowerCase()}` },
      update: {
        userId: dbUser.id,
        tier: user.tier,
        status: SubscriptionStatus.ACTIVE,
      },
      create: {
        id: `sub-${user.tier.toLowerCase()}`,
        userId: dbUser.id,
        tier: user.tier,
        period: "MONTHLY",
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
      },
    });
    console.log(`Active subscription created/updated for ${dbUser.email}`);
  }

  // 3. Clear existing articles to ensure idempotency
  await prisma.article.deleteMany({});
  console.log("Cleared existing articles.");

  const articlesData = [
    {
      title: "Guide de l'Investisseur Débutant",
      slug: "guide-de-l-investisseur-debutant",
      excerpt: "Découvrez les bases de l'investissement dans la sous-région ouest-africaine.",
      content: "Contenu détaillé du guide de l'investisseur débutant. Ce guide couvre les bases fondamentales de l'investissement en Afrique de l'Ouest.",
      category: "Investissement",
      visibility: ArticleVisibility.PUBLIC,
      published: true,
      publishedAt: new Date("2026-06-10T10:00:00Z"),
      authorId: admin.id,
    },
    {
      title: "Opportunités Immobilières à Abidjan",
      slug: "opportunites-immobilieres-a-abidjan",
      excerpt: "Analyse complète du marché immobilier résidentiel et commercial à Abidjan.",
      content: "Contenu détaillé sur le marché immobilier à Abidjan. Les quartiers en forte croissance comme Cocody, Marcory et Assinie.",
      category: "Immobilier",
      visibility: ArticleVisibility.AFFRANCHI,
      published: true,
      publishedAt: new Date("2026-06-11T10:00:00Z"),
      authorId: admin.id,
    },
    {
      title: "Stratégies d'Exportation en Afrique de l'Ouest",
      slug: "strategies-d-exportation-en-afrique-de-l-ouest",
      excerpt: "Comment optimiser votre chaîne logistique et réglementaire pour l'exportation.",
      content: "Contenu détaillé sur les stratégies d'exportation en Afrique de l'Ouest. Analyse approfondie des barrières douanières et logistiques.",
      category: "Business",
      visibility: ArticleVisibility.GRAND_FRERE,
      published: true,
      publishedAt: new Date("2026-06-12T10:00:00Z"),
      authorId: admin.id,
    },
    {
      title: "Capital-Investissement & Deals Exclusifs",
      slug: "capital-investissement-deals-exclusifs",
      excerpt: "Accédez aux coulisses des plus grands deals de la zone UEMOA.",
      content: "Contenu très confidentiel sur le capital-investissement destiné aux membres de niveau BOSS. Analyse des rendements et retours d'expérience.",
      category: "Partenariat",
      visibility: ArticleVisibility.BOSS,
      published: true,
      publishedAt: new Date("2026-06-13T10:00:00Z"),
      authorId: admin.id,
    },
  ];

  for (const data of articlesData) {
    const article = await prisma.article.create({ data });
    console.log(`Created article: ${article.title} (${article.visibility})`);
  }

  console.log("Seed finished successfully!");
}

export const seedPromise = main()
  .catch((e) => {
    console.error("Seed error:", e);
    if (!process.env.VITEST) {
      process.exit(1);
    }
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

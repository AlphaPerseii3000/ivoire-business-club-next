import { prisma } from "../src/lib/prisma";
import { ArticleVisibility, UserRole } from "../src/generated/prisma/client";

async function main() {
  console.log("Starting seed...");

  // 1. Create or upsert a default admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@ivoirebusinessclub.com" },
    update: {},
    create: {
      email: "admin@ivoirebusinessclub.com",
      name: "Admin IBC",
      role: UserRole.ADMIN,
      passwordHash: "$2a$10$M68vJUp.Q6M.f7q7/5hTDeO2K8W7VbS/1fB2gZJ.UpeP.64/uR6G6", // dummy hash
    },
  });

  console.log("Admin user created/found:", admin.email);

  // 2. Clear existing articles to ensure idempotency
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

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

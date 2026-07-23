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

  // 4. Clear existing events to ensure idempotency
  await prisma.event.deleteMany({});
  console.log("Cleared existing events.");

  const eventsData = [
    {
      title: "Soirée Networking IBC - Juillet 2026",
      slug: "soiree-networking-ibc-juillet-2026",
      description: "Une soirée exclusive de networking pour les membres et partenaires d'Ivoire Business Club.",
      startDate: new Date("2026-07-15T18:30:00Z"),
      endDate: new Date("2026-07-15T22:00:00Z"),
      location: "Abidjan, Cocody",
      coverImagePath: null,
      status: "PUBLISHED" as const,
      authorId: admin.id,
    },
    {
      title: "Masterclass Investissement UEMOA",
      slug: "masterclass-investissement-uemoa",
      description: "Masterclass sur les opportunités d'investissement dans la zone UEMOA.",
      startDate: new Date("2026-05-20T09:00:00Z"),
      endDate: new Date("2026-05-20T12:00:00Z"),
      location: "Abidjan, Plateau",
      coverImagePath: null,
      status: "PUBLISHED" as const,
      authorId: admin.id,
    },
    {
      title: "Forum Partenariats 2026",
      slug: "forum-partenariats-2026",
      description: "Forum annuel des partenariats stratégiques.",
      startDate: new Date("2026-09-10T08:00:00Z"),
      endDate: new Date("2026-09-12T18:00:00Z"),
      location: "Grand-Bassam",
      coverImagePath: null,
      status: "CANCELLED" as const,
      authorId: admin.id,
    },
  ];

  for (const data of eventsData) {
    const event = await prisma.event.create({ data });
    console.log(`Created event: ${event.title} (${event.status})`);
  }

  // Clear existing experts to ensure idempotency
  await prisma.expert.deleteMany({});
  console.log("Cleared existing experts.");

  const expertsData = [
    {
      name: "Jean Koffi",
      slug: "jean-koffi",
      title: "Expert en Fiscalité UEMOA",
      bio: "Ancien inspecteur des impôts, Jean conseille les entreprises sur l'optimisation fiscale et douanière.",
      photoUrl: null,
      phone: "+225 01 02 03 04 05",
      email: "jean.koffi@example.com",
      whatsapp: "+225 01 02 03 04 05",
      specialties: "fiscalité, douane, optimisation",
      requiredTier: Tier.AFFRANCHI,
      isPublished: true,
    },
    {
      name: "Mariam Diallo",
      slug: "mariam-diallo",
      title: "Avocate d'Affaires",
      bio: "Spécialisée en droit des sociétés et levée de fonds en Afrique de l'Ouest.",
      photoUrl: null,
      phone: "+225 07 08 09 10 11",
      email: "mariam.diallo@example.com",
      whatsapp: "+225 07 08 09 10 11",
      specialties: "droit, levée de fonds, contrats",
      requiredTier: Tier.GRAND_FRERE,
      isPublished: true,
    },
    {
      name: "Serge N'Goran",
      slug: "serge-n-goran",
      title: "Mentor Business & Scale",
      bio: "Serial entrepreneur ayant accompagné plus de 50 startups vers la rentabilité.",
      photoUrl: null,
      phone: null,
      email: "serge.ngoran@example.com",
      whatsapp: null,
      specialties: "growth, mentorat, scale",
      requiredTier: Tier.BOSS,
      isPublished: false,
    },
  ];

  for (const data of expertsData) {
    const expert = await prisma.expert.create({ data });
    console.log(`Created expert: ${expert.name} (${expert.requiredTier}, published: ${expert.isPublished})`);
  }

  const companiesData = [
    {
      name: "KS Construction",
      slug: "ks-construction",
      description: "Entreprise générale de bâtiment spécialisée dans les chantiers de grande envergure en Côte d'Ivoire.",
      logoUrl: null,
      contactName: "Koffi Sekou",
      contactPhone: "+225 01 02 03 04 05",
      contactEmail: "koffi.sekou@ksconstruction.ci",
      website: "https://www.ksconstruction.ci",
      location: "Abidjan, Cocody",
      certifications: "ISO 9001, Agrément Qualibat",
      sectors: "btp, construction, genie civil",
      isPublished: true,
    },
    {
      name: "Ivoire Digital Agency",
      slug: "ivoire-digital-agency",
      description: "Agence conseil en transformation digitale, développement web/mobile et marketing de performance.",
      logoUrl: null,
      contactName: "Awa Koné",
      contactPhone: "+225 07 08 09 10 11",
      contactEmail: "contact@ivoiredigital.ci",
      website: "https://www.ivoiredigital.ci",
      location: "Abidjan, Plateau",
      certifications: "Partenaire AWS, Certifié Google Partner",
      sectors: "tech, digital, marketing",
      isPublished: true,
    },
    {
      name: "UEMOA Conseil",
      slug: "uemoa-conseil",
      description: "Cabinet de conseil en stratégie d'affaires, fusions-acquisitions et expansion dans la zone UEMOA.",
      logoUrl: null,
      contactName: "Moussa Traoré",
      contactPhone: "+225 05 06 07 08 09",
      contactEmail: "m.traore@uemoaconseil.com",
      website: "https://www.uemoaconseil.com",
      location: "Abidjan, Marcory",
      certifications: "Agrément COSUMAF",
      sectors: "conseil, finance, strategie",
      isPublished: false,
    },
    {
      name: "StartandGrowth",
      slug: "startandgrowth",
      description:
        "StartandGrowth met la technologie au service de la croissance des entreprises. " +
        "Sa mission : digitaliser les processus, réduire les coûts et booster la productivité. " +
        "Trois offres d'accompagnement : automatisation des opérations (rationalisation des tâches répétitives, " +
        "optimisation des flux de travail, réduction des coûts opérationnels), formation en IA pour les entreprises " +
        "(programmes de formation de pointe pour doter les équipes des compétences IA nécessaires), et " +
        "audit de performance logicielle (analyse approfondie des systèmes pour identifier les goulots d'étranglement, " +
        "optimiser les performances et assurer l'évolutivité).",
      logoUrl: null,
      contactName: "Aros Fonton",
      contactPhone: "+33 7 56 86 76 86",
      contactEmail: "arosf@startandgrowth.net",
      website: "https://www.startandgrowth.net",
      location: "France",
      certifications: null,
      sectors: "tech, digital, ia, automatisation, formation, audit logicielle, mode, assurance, finance, enseignement, sante, marketing, e-commerce, grande distribution",
      isPublished: true,
    },
  ];

  for (const data of companiesData) {
    const company = await prisma.company.upsert({
      where: { slug: data.slug },
      update: data,
      create: data,
    });
    console.log(`Created/Updated company: ${company.name} (published: ${company.isPublished})`);
  }


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

  // 5. Create comments
  await prisma.comment.deleteMany({});
  console.log("Cleared existing comments.");

  const affranchiUser = await prisma.user.findUniqueOrThrow({ where: { email: "member-affranchi@test.com" } });
  const grandFrereUser = await prisma.user.findUniqueOrThrow({ where: { email: "member-grandfrere@test.com" } });
  const bossUser = await prisma.user.findUniqueOrThrow({ where: { email: "member-boss@test.com" } });

  const createdArticles = await prisma.article.findMany({});
  
  for (const article of createdArticles) {
    if (article.slug === "guide-de-l-investisseur-debutant") {
      await prisma.comment.create({
        data: {
          content: "Excellent guide, merci pour le partage !",
          userId: affranchiUser.id,
          articleId: article.id,
        },
      });
      await prisma.comment.create({
        data: {
          content: "Très instructif pour débuter dans l'immobilier ou la tech.",
          userId: grandFrereUser.id,
          articleId: article.id,
        },
      });
    }
    
    if (article.slug === "opportunites-immobilieres-a-abidjan") {
      await prisma.comment.create({
        data: {
          content: "Les prix à Cocody ont explosé cette année.",
          userId: bossUser.id,
          articleId: article.id,
        },
      });
    }
  }
  console.log("Comments seeded.");

  // 6. Seed finished
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

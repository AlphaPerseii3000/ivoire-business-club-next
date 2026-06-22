import { slugify } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function generateUniqueCompanySlug(name: string, currentId?: string): Promise<string> {
  const baseSlug = slugify(name);
  if (!baseSlug) {
    throw new Error("Le nom ne permet pas de générer un slug valide.");
  }

  const existingCompanies = await prisma.company.findMany({
    where: {
      slug: { startsWith: baseSlug },
      ...(currentId ? { id: { not: currentId } } : {}),
    },
    select: { slug: true },
  });

  const existingSlugs = new Set(existingCompanies.map((c) => c.slug));
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

import { slugify } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function generateUniqueSlug(name: string, currentId?: string): Promise<string> {
  const baseSlug = slugify(name);
  if (!baseSlug) {
    throw new Error("Le nom ne permet pas de générer un slug valide.");
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.expert.findFirst({
      where: {
        slug,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

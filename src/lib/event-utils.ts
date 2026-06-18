import { slugify } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function generateUniqueSlug(title: string, currentId?: string) {
  const baseSlug = slugify(title);
  if (!baseSlug) {
    throw new Error("Le titre ne permet pas de générer un slug valide.");
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.event.findFirst({
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

export async function getNextPublishedEvent() {
  const now = new Date();
  const event = await prisma.event.findFirst({
    where: {
      status: "PUBLISHED",
      startDate: { gte: now },
    },
    orderBy: { startDate: "asc" },
  });

  return event;
}

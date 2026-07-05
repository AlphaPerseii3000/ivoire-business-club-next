import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

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
      visibility: "PUBLIC",
      startDate: { gte: now },
    },
    orderBy: { startDate: "asc" },
  });

  return event;
}

export async function getMomentsIbcPhotos(limit = 12) {
  try {
    const now = new Date();
    const photos = await prisma.eventGalleryPhoto.findMany({
      where: {
        event: {
          status: "PUBLISHED",
          visibility: "PUBLIC",
          startDate: { lt: now },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            startDate: true,
          },
        },
      },
    });
    return photos.filter((photo: { event?: unknown }) => photo.event != null);
  } catch (error) {
    console.error("Error fetching Moments IBC photos:", error);
    return [];
  }
}

export async function getPastEventsWithGalleryPreview(limit = 20) {
  try {
    const now = new Date();
    const pastEvents = await prisma.event.findMany({
      where: {
        startDate: { lt: now },
        status: "PUBLISHED",
      },
      orderBy: { startDate: "desc" },
      take: limit,
      include: {
        galleryPhotos: {
          take: 4,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            galleryPhotos: true,
            registrations: true,
          },
        },
      },
    });
    return pastEvents;
  } catch (error) {
    console.error("Error fetching past events with gallery preview:", error);
    return [];
  }
}


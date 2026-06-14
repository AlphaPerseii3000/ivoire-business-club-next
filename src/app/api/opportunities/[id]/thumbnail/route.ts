import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createDownloadSignedUrl, getMissingR2Env } from "@/lib/r2";

/**
 * GET /api/opportunities/[id]/thumbnail
 *
 * Public endpoint — no auth required.
 * Returns a 302 redirect to a signed S3 URL for the first image document
 * of the given opportunity. Falls back to 404 if no image exists.
 * Cacheable for 1 hour by CDN/browser.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const doc = await prisma.document.findFirst({
      where: {
        opportunityId: id,
        mimeType: { in: ["image/jpeg", "image/png", "image/webp"] },
      },
      orderBy: { createdAt: "asc" },
      select: { r2Key: true, mimeType: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Pas de vignette" }, { status: 404 });
    }

    if (getMissingR2Env().length > 0) {
      return NextResponse.json({ error: "Stockage indisponible" }, { status: 503 });
    }

    const signedUrl = await createDownloadSignedUrl({
      key: doc.r2Key,
      mimeType: doc.mimeType,
      expiresIn: 3600,
    });

    return NextResponse.redirect(signedUrl, 302);
  } catch (error) {
    console.error("Thumbnail error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
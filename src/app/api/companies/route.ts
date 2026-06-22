import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { companyCreateSchema } from "@/lib/validations";
import { generateUniqueCompanySlug } from "@/lib/company-utils";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      where: {
        isPublished: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: companies });
  } catch (error) {
    console.error("List companies error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const adminUser = await promoteConfiguredAdminUser(session.user.id);
    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide ou vide" },
        { status: 400 }
      );
    }

    const parsed = companyCreateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      logoUrl,
      contactName,
      contactPhone,
      contactEmail,
      website,
      location,
      certifications,
      sectors,
      isPublished,
    } = parsed.data;

    let slug;
    try {
      slug = await generateUniqueCompanySlug(name);
    } catch (slugError: any) {
      return NextResponse.json({ error: slugError.message }, { status: 400 });
    }

    try {
      const company = await prisma.company.create({
        data: {
          name,
          slug,
          description,
          logoUrl: logoUrl || null,
          contactName: contactName || null,
          contactPhone: contactPhone || null,
          contactEmail: contactEmail || null,
          website: website || null,
          location: location || null,
          certifications: certifications || null,
          sectors: sectors || null,
          isPublished: isPublished ?? false,
        },
      });

      await safeCreateAuditLog({
        actorId: session.user.id,
        action: "COMPANY_CREATE",
        entityType: "COMPANY",
        entityId: company.id,
        metadata: {
          name: company.name,
          isPublished: company.isPublished,
        },
      });

      return NextResponse.json(company, { status: 201 });
    } catch (dbError: any) {
      if (dbError.code === "P2002") {
        return NextResponse.json(
          { error: "Une entreprise avec ce nom ou slug existe déjà." },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Create company error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

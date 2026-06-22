import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { companyUpdateSchema } from "@/lib/validations";
import { generateUniqueCompanySlug } from "@/lib/company-utils";
import { sanitizeError } from "@/lib/sanitize-log";
import { safeCreateAuditLog } from "@/lib/audit-log";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    let isAdmin = false;
    if (session?.user?.id) {
      const adminUser = await promoteConfiguredAdminUser(session.user.id);
      isAdmin = adminUser?.role === "ADMIN";
    }

    const company = await prisma.company.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 });
    }

    if (!company.isPublished && !isAdmin) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Get company error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: "Corps de requête JSON invalide ou vide" }, { status: 400 });
    }

    const parsed = companyUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const company = await prisma.company.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 });
    }

    const data: any = { ...parsed.data };

    if (data.name && data.name !== company.name) {
      try {
        data.slug = await generateUniqueCompanySlug(data.name, company.id);
      } catch (slugError: any) {
        return NextResponse.json({ error: slugError.message }, { status: 400 });
      }
    }

    try {
      const updatedCompany = await prisma.company.update({
        where: { id: company.id },
        data,
      });

      await safeCreateAuditLog({
        actorId: session.user.id,
        action: "COMPANY_UPDATE",
        entityType: "COMPANY",
        entityId: updatedCompany.id,
        metadata: {
          name: updatedCompany.name,
          isPublished: updatedCompany.isPublished,
        },
      });

      if (company.isPublished !== updatedCompany.isPublished) {
        await safeCreateAuditLog({
          actorId: session.user.id,
          action: updatedCompany.isPublished ? "COMPANY_PUBLISH" : "COMPANY_UNPUBLISH",
          entityType: "COMPANY",
          entityId: updatedCompany.id,
          metadata: {
            name: updatedCompany.name,
            previousStatus: company.isPublished,
            newStatus: updatedCompany.isPublished,
          },
        });
      }

      return NextResponse.json(updatedCompany);
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
    console.error("Update company error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    const adminUser = await promoteConfiguredAdminUser(session.user.id);
    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const company = await prisma.company.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 });
    }

    await prisma.company.delete({
      where: { id: company.id },
    });

    await safeCreateAuditLog({
      actorId: session.user.id,
      action: "COMPANY_DELETE",
      entityType: "COMPANY",
      entityId: company.id,
      metadata: {
        name: company.name,
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("Delete company error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventRegistrationSchema } from "@/lib/validations";
import { normalizePricing, getPriceForTier } from "@/lib/event-utils";
import { posthogServer } from "@/lib/posthog-server";
import { Tier } from "@/generated/prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    const body = await req.json().catch(() => ({}));
    const parsed = eventRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Données d'inscription invalides";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const isMember = !!session?.user?.id;
    const rawEmail = isMember ? session.user.email : parsed.data.email;
    const email = rawEmail?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "L'adresse email est requise" },
        { status: 400 }
      );
    }

    const payOnSite = parsed.data.payOnSite ?? false;
    const provider = parsed.data.provider ?? "BANK_TRANSFER";
    const paymentMethod = payOnSite ? "PAY_ON_SITE" : provider;

    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          status: true,
          visibility: true,
          maxCapacity: true,
          pricing: true,
        },
      });

      if (!event || event.status !== "PUBLISHED") {
        throw new Error("Événement introuvable ou non publié");
      }

      if (event.visibility === "PRIVATE" && !isMember) {
        throw new Error("Cet événement est réservé aux membres connectés");
      }

      // Check capacity
      if (event.maxCapacity !== null && event.maxCapacity !== undefined) {
        const registeredCount = await tx.eventRegistration.count({
          where: {
            eventId: id,
            status: { in: ["REGISTERED", "ATTENDED"] },
          },
        });

        if (registeredCount >= event.maxCapacity) {
          throw new Error("L'événement est complet");
        }
      }

      // Check uniqueness by userId if member
      if (isMember && session.user.id) {
        const existingUserReg = await tx.eventRegistration.findUnique({
          where: {
            eventId_userId: {
              eventId: id,
              userId: session.user.id,
            },
          },
        });
        if (existingUserReg) {
          throw new Error("Vous êtes déjà inscrit à cet événement");
        }
      }

      // Check uniqueness by email
      const existingEmailReg = await tx.eventRegistration.findUnique({
        where: {
          eventId_email: {
            eventId: id,
            email,
          },
        },
      });
      if (existingEmailReg) {
        throw new Error("Vous êtes déjà inscrit à cet événement");
      }

      // Calculate price
      const pricing = normalizePricing(event.pricing);
      const tier = isMember ? ((session.user.tier as Tier) || "AFFRANCHI") : "AFFRANCHI";

      let calculatedPrice: number | null = null;
      if (isMember) {
        calculatedPrice = getPriceForTier(pricing, tier);
      } else {
        calculatedPrice = pricing?.visitor ?? null;
      }

      if (pricing && calculatedPrice === null) {
        const hasPaidTiers = Object.values(pricing).some((val) => typeof val === "number" && val > 0);
        if (hasPaidTiers) {
          throw new Error("Tarif non configuré pour votre statut/tier");
        }
      }

      const amountPaid = payOnSite ? null : (calculatedPrice ?? 0);

      const registration = await tx.eventRegistration.create({
        data: {
          eventId: id,
          userId: isMember ? session.user.id : null,
          email,
          tierSnapshot: tier,
          amountPaid,
          payOnSite,
          paymentMethod,
          status: "REGISTERED",
        },
      });

      let payment = null;
      if (isMember && session.user.id && !payOnSite && amountPaid && amountPaid > 0) {
        const providerRef = `EVT-${id}-${session.user.id}-${Date.now()}`;
        payment = await tx.payment.create({
          data: {
            userId: session.user.id,
            amount: amountPaid,
            currency: "XOF",
            provider,
            providerRef,
            status: "pending",
          },
        });
      }

      return { registration, payment, eventTitle: event.title };
    });

    // Capture Analytics
    posthogServer.capture({
      distinctId: session?.user?.id || email,
      event: "event_register",
      properties: {
        eventId: id,
        eventTitle: result.eventTitle,
        isVisitor: !isMember,
        payOnSite,
        paymentMethod: payOnSite ? "PAY_ON_SITE" : provider,
        amountPaid: result.registration.amountPaid ?? 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        registration: result.registration,
        payment: result.payment,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

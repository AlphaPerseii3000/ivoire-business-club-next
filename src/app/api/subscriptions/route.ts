import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subscriptionCreateSchema } from "@/lib/validations";
import { sanitizeError } from "@/lib/sanitize-log";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ data: subscriptions });
  } catch (error) {
    console.error("Subscriptions GET error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = subscriptionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tier, period } = parsed.data;
    const userId = session.user.id;
    const timestamp = Date.now();
    const providerRef = `IBC-${userId}-${tier}-${timestamp}`;

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          userId,
          tier,
          period,
          provider: "BANK_TRANSFER",
          providerRef,
          status: "TRIAL",
          startDate: new Date(),
        },
      });

      await tx.payment.create({
        data: {
          userId,
          amount: 0,
          currency: "EUR",
          provider: "BANK_TRANSFER",
          providerRef,
          status: "pending",
        },
      });

      return subscription;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("Subscription POST error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

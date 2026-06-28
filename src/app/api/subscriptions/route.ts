import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subscriptionCreateSchema } from "@/lib/validations";
import { sanitizeError } from "@/lib/sanitize-log";
import { getAmountForTier } from "@/lib/bank-transfer-config";
import { sendWelcomeEmail } from "@/lib/email";

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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const parsed = subscriptionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tier, period, provider, providerPhone } = parsed.data;
    const userId = session.user.id;
    const providerRef = `IBC-${userId}-${tier}`;
    const amount = getAmountForTier(tier);
    const isMobileMoney = provider === "WAVE" || provider === "ORANGE_MONEY";

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          userId,
          tier,
          period,
          provider,
          providerPhone: isMobileMoney ? providerPhone : null,
          providerRef,
          status: isMobileMoney ? "TRIAL" : "PENDING",
          startDate: new Date(),
        },
      });

      const payment = await tx.payment.create({
        data: {
          userId,
          amount,
          currency: "EUR",
          provider,
          providerRef,
          status: "pending",
        },
      });

      return {
        subscription,
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          provider: payment.provider,
          providerRef: payment.providerRef,
        },
      };
    });

    // Send dynamic welcome email only after the subscription transaction succeeds.
    // Failure here must not impact the 201 response.
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
        await sendWelcomeEmail({
          to: user.email,
          name: user.name,
          tier: result.subscription.tier,
          paymentProvider: result.subscription.provider,
          providerPhone: result.subscription.providerPhone,
          userId,
        });
      }
    } catch (emailError) {
      console.error(
        "Failed to send post-subscription welcome email:",
        sanitizeError(emailError)
      );
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("Subscription POST error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

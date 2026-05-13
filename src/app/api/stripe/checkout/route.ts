import { NextResponse } from "next/server";
import { getStripe, PLANS } from "@/lib/stripe";
import type { PlanKey, PlanPeriod } from "@/lib/stripe";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { plan, period } = body as { plan: PlanKey; period: PlanPeriod };

    if (!PLANS[plan] || !PLANS[plan][period]) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const priceId = PLANS[plan][period].priceId;
    if (!priceId) {
      return NextResponse.json({ error: "Configuration Stripe manquante" }, { status: 500 });
    }

    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?checkout=cancelled`,
      customer_email: session.user.email ?? undefined,
      metadata: {
        userId: session.user.id,
        plan,
        period,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Erreur lors de la création du checkout" }, { status: 500 });
  }
}

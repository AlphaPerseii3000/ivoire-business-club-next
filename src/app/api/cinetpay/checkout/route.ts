import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCinetPayCheckout, CINETPAY_PRICES } from "@/lib/cinetpay";
import type { PlanKey } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { plan, period } = body as { plan: PlanKey; period: "monthly" | "annual" };

    if (!CINETPAY_PRICES[plan as keyof typeof CINETPAY_PRICES]) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const prices = CINETPAY_PRICES[plan as keyof typeof CINETPAY_PRICES];
    const amount = period === "monthly" ? prices.monthly : prices.annual;
    const transactionId = `IBC_${Date.now()}_${session.user.id.slice(-6)}`;

    const result = await createCinetPayCheckout({
      transactionId,
      amount,
      currency: "XOF",
      description: `IBC ${plan} ${period}`,
      customerId: session.user.id,
      customerName: session.user.name ?? "Client",
      customerEmail: session.user.email ?? "",
      returnUrl: `${process.env.NEXTAUTH_URL}/dashboard?checkout=success`,
      notifyUrl: `${process.env.NEXTAUTH_URL}/api/cinetpay/webhook`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("CinetPay checkout error:", error);
    return NextResponse.json({ error: "Erreur CinetPay" }, { status: 500 });
  }
}

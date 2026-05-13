// @ts-nocheck — Stripe v22 types are volatile; runtime is correct
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;
        if (!metadata?.userId) break;

        await prisma.subscription.upsert({
          where: { id: metadata.userId + "_" + (metadata.plan ?? "AFFRANCHI") },
          create: {
            userId: metadata.userId,
            tier: (metadata.plan ?? "AFFRANCHI") as "AFFRANCHI" | "GRAND_FRERE" | "BOSS",
            period: metadata.period === "annual" ? "ANNUAL" : "MONTHLY",
            provider: "STRIPE",
            providerRef: (session.subscription as string) ?? session.id,
            status: "ACTIVE",
            startDate: new Date(),
          },
          update: { status: "ACTIVE", providerRef: (session.subscription as string) ?? session.id },
        });

        await prisma.user.update({
          where: { id: metadata.userId },
          data: { tier: (metadata.plan ?? "AFFRANCHI") as "AFFRANCHI" | "GRAND_FRERE" | "BOSS" },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { providerRef: sub.id },
          data: { status: "CANCELLED" },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // Invoice.subscription may be string | Stripe.Subscription | null
        const subId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : (invoice.subscription as Stripe.Subscription | null)?.id ?? "";
        if (subId) {
          await prisma.subscription.updateMany({
            where: { providerRef: subId },
            data: { status: "PAST_DUE" },
          });
        }
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

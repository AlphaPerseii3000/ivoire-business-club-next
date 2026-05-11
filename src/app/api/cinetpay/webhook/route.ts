import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCinetPaySignature } from "@/lib/cinetpay";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const apiKey = process.env.CINETPAY_API_KEY ?? "";

    if (!verifyCinetPaySignature(data, apiKey)) {
      return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
    }

    if (data.status === "ACCEPTED") {
      const { transaction_id, customer_id } = data;
      const metadata = data.metadata ?? {};

      await prisma.payment.create({
        data: {
          userId: customer_id,
          amount: data.amount,
          currency: "XOF",
          provider: "CINETPAY",
          providerRef: transaction_id,
          status: "succeeded",
        },
      });

      await prisma.subscription.upsert({
        where: { id: customer_id + "_" + (metadata.plan ?? "AFFRANCHI") },
        create: {
          userId: customer_id,
          tier: (metadata.plan ?? "AFFRANCHI") as any,
          period: (metadata.period ?? "MONTHLY") as string,
          provider: "CINETPAY",
          providerRef: transaction_id,
          status: "ACTIVE",
          startDate: new Date(),
        },
        update: { status: "ACTIVE" },
      });

      await prisma.user.update({
        where: { id: customer_id },
        data: { tier: (metadata.plan ?? "AFFRANCHI") as any },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("CinetPay webhook error:", error);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}

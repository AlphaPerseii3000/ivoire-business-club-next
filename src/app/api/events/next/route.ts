import { NextResponse } from "next/server";
import { getNextPublishedEvent } from "@/lib/event-utils";
import { sanitizeError } from "@/lib/sanitize-log";

export async function GET() {
  try {
    const event = await getNextPublishedEvent();

    return NextResponse.json({ data: event });
  } catch (error) {
    console.error("Next published event error:", sanitizeError(error));
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, Lock, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  formatEventDate,
  formatPrice,
  getEventTypeLabel,
  isPrivateEventForVisitor,
  normalizePricing,
  formatEventPricing,
} from "@/lib/event-utils";

export interface EventCardEvent {
  id: string;
  slug: string;
  title: string;
  startDate: Date;
  endDate?: Date | null;
  location?: string | null;
  onlineUrl?: string | null;
  coverImagePath?: string | null;
  eventType?: string | null;
  visibility?: string | null;
  pricing?: unknown;
  maxCapacity?: number | null;
}

export interface EventCardProps {
  event: EventCardEvent;
  isAuthenticated?: boolean;
  userTier?: string | null;
}

export function EventCard({ event, isAuthenticated = false, userTier = null }: EventCardProps) {
  const formattedDate = formatEventDate(event.startDate);
  const isPrivateVisitor = isPrivateEventForVisitor(event.visibility, isAuthenticated);
  const eventTypeLabel = getEventTypeLabel(event.eventType);
  const pricing = normalizePricing(event.pricing);
  const { memberMin, isFree } = formatEventPricing(pricing);

  const hasImage = event.coverImagePath ? event.coverImagePath !== "" : false;
  const coverUrl = hasImage ? `/api/media/events/${event.id}/cover` : null;

  const priceLabel = isFree ? "Gratuit" : `${formatPrice(memberMin, "Gratuit")}`;
  const ctaLabel = isPrivateVisitor ? "Devenir membre pour réserver" : "S'inscrire";

  return (
    <Link href={`/events/${event.slug}`} className="group block h-full">
      <Card className="h-full flex flex-col justify-between overflow-hidden border border-border/40 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/5 hover:border-teal-500/20">
        {coverUrl ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border/10">
            <Image
              src={coverUrl}
              alt={event.title}
              fill
              unoptimized
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
                isPrivateVisitor ? "blur-md" : ""
              }`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {isPrivateVisitor ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  <Lock className="size-3.5" aria-hidden="true" />
                  Privé
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border/10 bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center">
            <span className="text-muted-foreground/20 text-xs font-bold tracking-widest">IBC</span>
          </div>
        )}

        <CardHeader className="gap-2 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-400 ring-1 ring-inset ring-teal-400/20">
              {eventTypeLabel}
            </span>
            {isPrivateVisitor ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-400/20">
                <Lock className="size-3" aria-hidden="true" />
                Privé
              </span>
            ) : null}
          </div>
          <CardTitle className="text-lg font-bold tracking-tight text-foreground line-clamp-2">
            {event.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="px-5 pb-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="size-4 shrink-0" aria-hidden="true" />
            <span>{formattedDate}</span>
          </div>
          <div className={`mt-2 flex items-center gap-2 text-sm text-muted-foreground ${isPrivateVisitor ? "blur-md select-none" : ""}`}>
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">
              {event.eventType === "ONLINE"
                ? (event.onlineUrl ? `En ligne — ${event.onlineUrl.replace(/^https?:\/\//, "").split("/")[0]}` : "En ligne")
                : (event.location ? event.location : "Lieu à confirmer")}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/10 pt-3">
            <div className="text-sm">
              {isPrivateVisitor ? (
                <span className="text-muted-foreground line-through">
                  {formatPrice(memberMin, "Gratuit")}
                </span>
              ) : (
                <span className="font-medium text-foreground">
                  {isFree ? "Gratuit" : `À partir de ${priceLabel}`}
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A847] px-3 py-1.5 text-xs font-semibold text-black">
              {isPrivateVisitor ? <Users className="size-3.5" aria-hidden="true" /> : null}
              {ctaLabel}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export interface EventCardEvent {
  id: string;
  slug: string;
  title: string;
  startDate: Date;
  endDate?: Date | null;
  location?: string | null;
  coverImagePath?: string | null;
}

export interface EventCardProps {
  event: EventCardEvent;
}

export function EventCard({ event }: EventCardProps) {
  const formattedDate = event.startDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hasImage = event.coverImagePath ? event.coverImagePath !== "" : false;
  const coverUrl = hasImage ? `/api/media/events/${event.id}/cover` : null;

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
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border/10 bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center">
            <span className="text-muted-foreground/20 text-xs font-bold tracking-widest">IBC</span>
          </div>
        )}

        <CardHeader className="gap-2 p-5">
          <CardTitle className="text-lg font-bold tracking-tight text-foreground line-clamp-2">
            {event.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="px-5 pb-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="size-4 shrink-0" aria-hidden="true" />
            <span>{formattedDate}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">{event.location ? event.location : "En ligne"}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

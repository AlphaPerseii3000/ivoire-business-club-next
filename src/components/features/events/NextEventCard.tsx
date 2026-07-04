import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, ArrowRight } from "lucide-react";

export interface NextEventCardEvent {
  id: string;
  slug: string;
  title: string;
  startDate: Date;
  endDate?: Date | null;
  location?: string | null;
  coverImagePath?: string | null;
}

export interface NextEventCardProps {
  event: NextEventCardEvent;
}

export function NextEventCard({ event }: NextEventCardProps) {
  const formattedDate = event.startDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hasImage = event.coverImagePath ? event.coverImagePath !== "" : false;

  return (
    <section className="w-full bg-[#090D16] py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-8 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Prochain événement
        </h2>

        <Link
          href={`/events/${event.slug}`}
          className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all duration-300 hover:border-[#D4A847]/30 hover:bg-white/[0.07]"
        >
          <div className="flex flex-col md:flex-row">
            {hasImage ? (
              <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden md:aspect-auto md:w-2/5">
                <Image
                  src={event.coverImagePath as string}
                  alt={event.title}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              </div>
            ) : (
              <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-gradient-to-br from-[#D4A847]/20 to-[#090D16] md:aspect-auto md:w-2/5 flex items-center justify-center">
                <span className="text-[#D4A847]/30 text-2xl font-bold tracking-widest">IBC</span>
              </div>
            )}

            <div className="flex flex-1 flex-col justify-between p-6 md:p-8">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {event.title}
                </h3>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 shrink-0 text-[#D4A847]" aria-hidden="true" />
                    <span>{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0 text-[#D4A847]" aria-hidden="true" />
                    <span className="line-clamp-1">{event.location ? event.location : "En ligne"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center">
                <span
                  className="inline-flex items-center gap-2 rounded-lg bg-[#D4A847] px-5 py-2.5 text-sm font-semibold text-black transition-colors group-hover:bg-[#D4A847]/90"
                >
                  En savoir plus
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BlurReveal } from '@/components/ui/blur-reveal';
import { formatEventDate } from '@/lib/event-utils';

export type MomentPhoto = {
  id: string;
  eventId: string;
  filePath: string;
  caption?: string | null;
  createdAt: Date | string;
  event: {
    id: string;
    slug: string;
    title: string;
    startDate: Date | string;
  };
};

export type MomentsIbcProps = {
  photos?: MomentPhoto[] | null;
};

export function MomentsIbc({ photos }: MomentsIbcProps) {
  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <section id="moments-ibc" className="bg-[#090D16] py-24 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <BlurReveal>
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="text-[#D4A847] text-sm font-semibold uppercase tracking-wider">
              Vie du Club & Rétrospective
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Moments IBC</h2>
            <p className="mt-4 text-slate-400">
              Découvrez l&apos;énergie et les moments forts de nos derniers événements exclusifs.
            </p>
          </div>
        </BlurReveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo, i) => {
            const mediaUrl =
              photo.filePath.startsWith('http://') ||
              photo.filePath.startsWith('https://') ||
              photo.filePath.startsWith('/api/media')
                ? photo.filePath
                : `/api/media${photo.filePath}`;

            const formattedDate = photo.event.startDate
              ? formatEventDate(new Date(photo.event.startDate))
              : '';

            return (
              <BlurReveal key={photo.id} delay={i * 80}>
                <Link
                  href={`/events/${photo.event.slug}`}
                  className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#D4A847]/40 hover:shadow-2xl hover:shadow-[#D4A847]/10"
                >
                  {/* Photo container */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                    <Image
                      src={mediaUrl}
                      alt={photo.caption || photo.event.title}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/40 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />

                    {/* Top Date Badge */}
                    {formattedDate && (
                      <div className="absolute top-3 left-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] font-medium text-[#D4A847] backdrop-blur-md">
                        {formattedDate}
                      </div>
                    )}
                  </div>

                  {/* Bottom details */}
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-white transition-colors group-hover:text-[#D4A847] line-clamp-1">
                      {photo.event.title}
                    </h3>
                    {photo.caption ? (
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                        {photo.caption}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500 italic">
                        Photo de l&apos;événement
                      </p>
                    )}
                  </div>
                </Link>
              </BlurReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default MomentsIbc;

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Video, Images, ArrowRight, Lock, Globe } from 'lucide-react';
import { formatEventDate, getEventTypeLabel } from '@/lib/event-utils';

export type PastEventCardItem = {
  id: string;
  title: string;
  slug: string;
  startDate: Date | string;
  eventType: string | null;
  visibility: string | null;
  location?: string | null;
  onlineUrl?: string | null;
  coverImagePath?: string | null;
  galleryPhotos?: { id: string; filePath: string; caption?: string | null }[];
  _count?: {
    galleryPhotos?: number;
    registrations?: number;
  };
};

export type PastEventCardProps = {
  event: PastEventCardItem;
};

export function PastEventCard({ event }: PastEventCardProps) {
  const formattedDate = formatEventDate(new Date(event.startDate));
  const isOnline = event.eventType === 'ONLINE';
  const isPrivate = event.visibility === 'PRIVATE';
  const totalPhotos = event._count?.galleryPhotos ?? event.galleryPhotos?.length ?? 0;
  const coverUrl = event.coverImagePath
    ? event.coverImagePath.startsWith('http://') ||
      event.coverImagePath.startsWith('https://') ||
      event.coverImagePath.startsWith('/api/media')
      ? event.coverImagePath
      : `/api/media${event.coverImagePath}`
    : null;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition-all duration-300 hover:border-[#D4A847]/40 hover:bg-white/[0.05] hover:shadow-xl hover:shadow-[#D4A847]/5">
      <div>
        {/* Cover image or fallback */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-900 border border-white/5 mb-4">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={event.title}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <span className="text-xl font-black tracking-widest text-[#D4A847]/40">IBC</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-md">
              {isOnline ? <Video className="size-3 text-cyan-400" /> : <MapPin className="size-3 text-emerald-400" />}
              {getEventTypeLabel(event.eventType)}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md ${
              isPrivate
                ? 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                : 'border-blue-500/30 bg-blue-500/20 text-blue-300'
            }`}>
              {isPrivate ? <Lock className="size-3" /> : <Globe className="size-3" />}
              {isPrivate ? 'Privé' : 'Public'}
            </span>
          </div>

          {/* Photo count badge */}
          <div className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/70 px-2.5 py-0.5 text-xs font-medium text-[#D4A847] backdrop-blur-md flex items-center gap-1">
            <Images className="size-3.5" />
            <span>{totalPhotos} photo{totalPhotos > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white transition-colors group-hover:text-[#D4A847] line-clamp-1 mb-2">
          {event.title}
        </h3>

        {/* Metadata */}
        <div className="space-y-1 text-xs text-slate-400 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-[#D4A847]" />
            <span>{formattedDate}</span>
          </div>
          {(event.location || event.onlineUrl) && (
            <div className="flex items-center gap-2">
              {isOnline ? <Video className="size-3.5 text-cyan-400" /> : <MapPin className="size-3.5 text-emerald-400" />}
              <span className="truncate">{isOnline ? event.onlineUrl || 'Lien visio' : event.location}</span>
            </div>
          )}
        </div>

        {/* Gallery Thumbnails Preview */}
        {event.galleryPhotos && event.galleryPhotos.length > 0 && (
          <div className="mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
              Aperçu de la galerie
            </span>
            <div className="grid grid-cols-4 gap-2">
              {event.galleryPhotos.slice(0, 4).map((photo) => {
                const photoUrl =
                  photo.filePath.startsWith('http://') ||
                  photo.filePath.startsWith('https://') ||
                  photo.filePath.startsWith('/api/media')
                    ? photo.filePath
                    : `/api/media${photo.filePath}`;

                return (
                  <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-slate-800">
                    <Image
                      src={photoUrl}
                      alt={photo.caption || 'Aperçu photo'}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* CTA Button */}
      <div className="border-t border-white/5 pt-4 mt-2">
        <Link
          href={`/dashboard/events/${event.slug}/gallery`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#D4A847]/40 bg-[#D4A847]/10 px-4 py-2.5 text-xs font-semibold text-[#D4A847] hover:bg-[#D4A847] hover:text-black transition-all duration-300"
        >
          <span>Consulter la galerie</span>
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

export default PastEventCard;

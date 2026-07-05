"use client";

import { useState } from "react";
import { EventGallery, GalleryPhoto } from "@/components/features/events/EventGallery";

interface EventGalleryClientProps {
  eventId: string;
  initialPhotos: GalleryPhoto[];
  currentUserId?: string;
  currentUserRole?: string;
  isPastEvent: boolean;
}

export function EventGalleryClient({
  eventId,
  initialPhotos,
  currentUserId,
  currentUserRole,
  isPastEvent,
}: EventGalleryClientProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos);

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/gallery`);
      if (res.ok) {
        const body = await res.json();
        if (body.data) {
          setPhotos(body.data);
        }
      }
    } catch {
      // Ignorer les erreurs réseau temporaires
    }
  };

  return (
    <EventGallery
      eventId={eventId}
      photos={photos}
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      isPastEvent={isPastEvent}
      canUpload={true}
      readOnly={false}
      onRefresh={fetchPhotos}
    />
  );
}

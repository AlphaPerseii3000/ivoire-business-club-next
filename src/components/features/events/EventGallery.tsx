"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2, Plus, X, Camera, User, Loader2 } from "lucide-react";
import { EventGalleryUploadModal } from "./EventGalleryUploadModal";

export interface GalleryPhoto {
  id: string;
  eventId: string;
  uploadedById: string;
  filePath: string;
  caption?: string | null;
  createdAt: Date | string;
  uploader?: {
    id?: string;
    name?: string | null;
    image?: string | null;
  } | null;
}

interface EventGalleryProps {
  eventId: string;
  photos: GalleryPhoto[];
  currentUserId?: string;
  currentUserRole?: string;
  isPastEvent?: boolean;
  canUpload?: boolean;
  readOnly?: boolean;
  onRefresh?: () => void;
}

export function EventGallery({
  eventId,
  photos,
  currentUserId,
  currentUserRole,
  isPastEvent = true,
  canUpload = true,
  readOnly = false,
  onRefresh,
}: EventGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUserRole === "ADMIN";

  const handleDeletePhoto = async (photo: GalleryPhoto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette photo ?")) return;

    setDeletingId(photo.id);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/gallery/${photo.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la suppression de la photo.");
      }

      if (selectedPhoto?.id === photo.id) {
        setSelectedPhoto(null);
      }

      if (onRefresh) {
        onRefresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de suppression.");
    } finally {
      setDeletingId(null);
    }
  };

  const getMediaUrl = (filePath: string) => {
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }
    return `/api/media${filePath.startsWith("/") ? "" : "/"}${filePath}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Camera className="w-6 h-6 text-amber-500" />
            Galerie photos
            <span className="text-sm font-normal text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full ml-2">
              {photos.length}
            </span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Les moments forts partagés par les membres et l&apos;équipe IBC.
          </p>
        </div>

        {!readOnly && canUpload && isPastEvent && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2.5 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition flex items-center gap-2 shadow-lg shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" />
            Ajouter des photos
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-500/30 text-red-300 text-sm rounded-lg">
          {error}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500">
            <Camera className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-slate-300">
            Aucune photo partagée pour le moment
          </h3>
          <p className="text-slate-500 text-sm max-w-sm">
            {isPastEvent
              ? "Soyez le premier à partager vos souvenirs et moments d'échange !"
              : "La galerie s'ouvrira dès le début du déroulement de cet événement."}
          </p>
          {!readOnly && canUpload && isPastEvent && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-2 px-4 py-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition"
            >
              + Partager une première photo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => {
            const isOwner = currentUserId && photo.uploadedById === currentUserId;
            const canDelete = !readOnly && (isAdmin || isOwner);

            return (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:border-slate-700 transition shadow-md flex flex-col"
              >
                <div className="relative aspect-[4/3] w-full bg-slate-950 overflow-hidden">
                  <Image
                    src={getMediaUrl(photo.filePath)}
                    alt={photo.caption || "Photo galerie événement"}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-200" />
                </div>

                {canDelete && (
                  <button
                    onClick={(e) => handleDeletePhoto(photo, e)}
                    disabled={deletingId === photo.id}
                    title="Supprimer la photo"
                    className="absolute top-2 right-2 p-2 rounded-lg bg-red-600/80 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition duration-200 shadow-md backdrop-blur-sm z-10"
                  >
                    {deletingId === photo.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}

                <div className="p-3 flex items-center justify-between text-xs text-slate-400 bg-slate-900">
                  <div className="flex items-center gap-2 truncate">
                    {photo.uploader?.image ? (
                      <Image
                        src={photo.uploader.image}
                        alt={photo.uploader.name || "Uploader"}
                        width={20}
                        height={20}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <User className="w-3 h-3" />
                      </div>
                    )}
                    <span className="truncate font-medium text-slate-300">
                      {photo.uploader?.name || "Membre IBC"}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(photo.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>

                {photo.caption && (
                  <div className="px-3 pb-3 text-xs text-slate-300 line-clamp-1 italic">
                    « {photo.caption} »
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Modal d'agrandissement */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 text-slate-300 hover:text-white hover:bg-black/80 transition"
              aria-label="Fermer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="relative w-full h-[65vh] bg-black flex items-center justify-center">
              <Image
                src={getMediaUrl(selectedPhoto.filePath)}
                alt={selectedPhoto.caption || "Photo agrandie"}
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <div>
                {selectedPhoto.caption && (
                  <p className="text-white text-base font-medium mb-1">
                    {selectedPhoto.caption}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Partagé par {selectedPhoto.uploader?.name || "Membre IBC"}</span>
                  <span>•</span>
                  <span>
                    {new Date(selectedPhoto.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {!readOnly &&
                (isAdmin || (currentUserId && selectedPhoto.uploadedById === currentUserId)) && (
                  <button
                    onClick={(e) => handleDeletePhoto(selectedPhoto, e)}
                    disabled={deletingId === selectedPhoto.id}
                    className="px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg border border-red-500/20 transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Modal d'upload */}
      {!readOnly && canUpload && isPastEvent && (
        <EventGalleryUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          eventId={eventId}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}

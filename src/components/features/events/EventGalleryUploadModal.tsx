"use client";

import { useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface EventGalleryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess: () => void;
}

export function EventGalleryUploadModal({
  isOpen,
  onClose,
  eventId,
  onSuccess,
}: EventGalleryUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setError(null);
    if (!selected) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Format d'image non supporté. Utilisez JPEG, PNG ou WebP.");
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("La taille de l'image dépasse la limite de 10 Mo.");
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setError(null);
    const selected = e.dataTransfer.files?.[0];
    if (!selected) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Format d'image non supporté. Utilisez JPEG, PNG ou WebP.");
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("La taille de l'image dépasse la limite de 10 Mo.");
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Veuillez sélectionner une photo à uploader.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }

      const res = await fetch(`/api/events/${eventId}/gallery`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'upload de la photo.");
      }

      // Re-initialiser le formulaire
      setFile(null);
      setPreviewUrl(null);
      setCaption("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setFile(null);
    setPreviewUrl(null);
    setCaption("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-amber-500" />
          Ajouter une photo à la galerie
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500/30 text-red-300 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center bg-slate-950/50 min-h-[180px] relative overflow-hidden"
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />

            {previewUrl ? (
              <div className="relative w-full h-40 rounded-lg overflow-hidden">
                <Image
                  src={previewUrl}
                  alt="Prévisualisation"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition text-sm text-white font-medium">
                  Cliquer pour changer de photo
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <ImageIcon className="w-10 h-10 text-slate-500" />
                <p className="text-sm font-medium">
                  Glissez-déposez une photo ici ou{" "}
                  <span className="text-amber-500 underline">parcourir</span>
                </p>
                <p className="text-xs text-slate-500">
                  JPEG, PNG, WebP (Max 10 Mo)
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Légende (optionnelle)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ex: Moment d'échange lors de la pause café..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="px-5 py-2 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Upload en cours..." : "Publier la photo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

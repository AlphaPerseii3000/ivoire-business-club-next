"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Paperclip, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DOCUMENT_ALLOWED_MIME_TYPES, DOCUMENT_MAX_SIZE_BYTES } from "@/lib/validations";
import { DocumentRow, type LegalDocument } from "./document-row";

type PendingDocument = {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
};

type DocumentUploadSectionProps = {
  opportunityId?: string;
  initialDocuments?: LegalDocument[];
  documentCount?: number;
  canUpload?: boolean;
  canPreview?: boolean;
  onPendingFilesChange?: (files: File[]) => void;
};

type PresignResponse = {
  data?: { signedUrl: string; r2Key: string; fileName: string };
  error?: string;
};

type CompleteResponse = {
  data?: LegalDocument;
  error?: string;
};

function validateFile(file: File) {
  if (!DOCUMENT_ALLOWED_MIME_TYPES.includes(file.type as (typeof DOCUMENT_ALLOWED_MIME_TYPES)[number])) {
    return "Type de fichier non supporté. Utilisez PDF, JPEG, PNG ou WebP.";
  }
  if (file.size > DOCUMENT_MAX_SIZE_BYTES) {
    return "Le fichier dépasse la taille maximale de 10 Mo.";
  }
  return null;
}

function uploadWithProgress(url: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error("Upload refusé"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload interrompu"));
    xhr.send(file);
  });
}

export async function uploadLegalDocument(opportunityId: string, file: File, onProgress: (progress: number) => void) {
  const presignRes = await fetch(`/api/opportunities/${opportunityId}/documents/presign-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, mimeType: file.type, size: file.size }),
  });
  const presignBody = (await presignRes.json()) as PresignResponse;
  if (!presignRes.ok || !presignBody.data) {
    throw new Error(presignBody.error ?? "Impossible de préparer l'upload");
  }

  await uploadWithProgress(presignBody.data.signedUrl, file, onProgress);

  const completeRes = await fetch(`/api/opportunities/${opportunityId}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      r2Key: presignBody.data.r2Key,
      fileName: presignBody.data.fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    }),
  });
  const completeBody = (await completeRes.json()) as CompleteResponse;
  if (!completeRes.ok || !completeBody.data) {
    throw new Error(completeBody.error ?? "Impossible d'attacher le document");
  }
  return completeBody.data;
}

export async function uploadPendingLegalDocuments(opportunityId: string, files: File[]) {
  const uploaded: LegalDocument[] = [];
  for (const file of files) {
    const document = await uploadLegalDocument(opportunityId, file, () => undefined);
    uploaded.push(document);
  }
  return uploaded;
}

export function DocumentUploadSection({
  opportunityId,
  initialDocuments = [],
  documentCount,
  canUpload = true,
  canPreview = true,
  onPendingFilesChange,
}: DocumentUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<LegalDocument[]>(initialDocuments);
  const [pending, setPending] = useState<PendingDocument[]>([]);
  const [preview, setPreview] = useState<{ document: LegalDocument; url: string } | null>(null);

  useEffect(() => {
    setDocuments(initialDocuments);
    setPreview(null);
  }, [initialDocuments, opportunityId]);

  const syncPending = (next: PendingDocument[]) => {
    setPending(next);
    onPendingFilesChange?.(next.filter((item) => item.status === "pending").map((item) => item.file));
  };

  const addFiles = async (selectedFiles: FileList | null) => {
    const files = Array.from(selectedFiles ?? []);
    const validFiles: File[] = [];
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    if (!opportunityId) {
      const next = [
        ...pending,
        ...validFiles.map((file) => ({ id: crypto.randomUUID(), file, progress: 0, status: "pending" as const })),
      ];
      syncPending(next);
      toast.success("Document prêt à être attaché après création du deal.");
      return;
    }

    const uploadItems = validFiles.map((file) => ({ id: crypto.randomUUID(), file, progress: 0, status: "uploading" as const }));
    setPending((current) => [...current, ...uploadItems]);

    for (const item of uploadItems) {
      try {
        const created = await uploadLegalDocument(opportunityId, item.file, (progress) => {
          setPending((current) => current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, progress } : currentItem)));
        });
        setDocuments((current) => [created, ...current]);
        setPending((current) => current.filter((currentItem) => currentItem.id !== item.id));
        toast.success("Document ajouté avec succès.");
      } catch (error) {
        setPending((current) => current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, status: "error", progress: 0 } : currentItem)));
        toast.error(error instanceof Error ? error.message : "Upload interrompu.");
      }
    }
  };

  const requestDocumentUrl = async (document: LegalDocument, action: "preview" | "download") => {
    if (!opportunityId) return null;
    const res = await fetch(`/api/opportunities/${opportunityId}/documents/${document.id}/${action}`);
    const body = (await res.json()) as { data?: { signedUrl: string }; error?: string };
    if (!res.ok || !body.data) {
      toast.error(body.error ?? "Aperçu indisponible");
      return null;
    }
    return body.data.signedUrl;
  };

  const openPreview = async (document: LegalDocument) => {
    const signedUrl = await requestDocumentUrl(document, "preview");
    if (!signedUrl) return;
    setPreview({ document, url: signedUrl });
  };

  const downloadDocument = async (document: LegalDocument) => {
    const signedUrl = await requestDocumentUrl(document, "download");
    if (!signedUrl) return;
    window.open(signedUrl, "_blank", "noopener,noreferrer");
  };

  const deleteDocument = async (document: LegalDocument) => {
    if (!opportunityId) return;
    const confirmed = window.confirm(`Supprimer définitivement le document « ${document.originalName} » ?`);
    if (!confirmed) return;
    const res = await fetch(`/api/opportunities/${opportunityId}/documents/${document.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? "Suppression impossible");
      return;
    }
    setDocuments((current) => current.filter((item) => item.id !== document.id));
    toast.success("Document supprimé.");
  };

  const isMetadataHidden = !canUpload && !canPreview;

  // Use server-provided count only when full metadata is intentionally hidden; otherwise
  // keep the visible counter in sync with local upload/delete state.
  const displayCount = isMetadataHidden ? documentCount ?? 0 : documents.length + pending.length;

  // Non-author non-admin viewers see only a counter, no upload or document list
  if (isMetadataHidden) {
    return (
      <section className="rounded-xl border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Paperclip className="h-5 w-5" aria-hidden="true" />
          Documents juridiques
          {displayCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm text-primary">{displayCount}</span>
          ) : null}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {displayCount > 0
            ? `${displayCount} document${displayCount > 1 ? "s" : ""} juridique${displayCount > 1 ? "s" : ""} joint${displayCount > 1 ? "s" : ""} à cette opportunité.`
            : "Aucun document juridique joint pour le moment."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Paperclip className="h-5 w-5" aria-hidden="true" />
            Documents juridiques
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm text-primary">{displayCount}</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">PDF, JPEG, PNG ou WebP · 10 Mo maximum par fichier</p>
        </div>
        {canUpload ? (
          <Button type="button" className="min-h-11" onClick={() => inputRef.current?.click()}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Ajouter un document
          </Button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        multiple
        accept={DOCUMENT_ALLOWED_MIME_TYPES.join(",")}
        onChange={(event) => {
          void addFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      <div className="mt-5 space-y-3">
        {pending.map((item) => (
          <DocumentRow
            key={item.id}
            document={{ id: item.id, fileName: item.file.name, originalName: item.file.name, mimeType: item.file.type, size: item.file.size }}
            progress={item.progress}
            isUploading={item.status === "uploading"}
            canPreview={false}
          />
        ))}
        {documents.map((document) => (
          <DocumentRow
            key={document.id}
            document={document}
            canPreview={canPreview}
            onPreview={openPreview}
            onDownload={downloadDocument}
            onDelete={canUpload ? deleteDocument : undefined}
          />
        ))}
        {displayCount === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucun document juridique attaché pour le moment.
          </div>
        ) : null}
      </div>

      {preview ? (
        <div className="mt-5 rounded-xl border bg-background p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium">Aperçu — {preview.document.originalName}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(null)}>
              Fermer
            </Button>
          </div>
          {preview.document.mimeType === "application/pdf" ? (
            <iframe title={`Aperçu ${preview.document.originalName}`} src={preview.url} className="h-[520px] w-full rounded-lg border" />
          ) : (
            <div className="relative h-[520px] w-full overflow-hidden rounded-lg border">
              <Image src={preview.url} alt={`Aperçu ${preview.document.originalName}`} fill className="object-contain" unoptimized />
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

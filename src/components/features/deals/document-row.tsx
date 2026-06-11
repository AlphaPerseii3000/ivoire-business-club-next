"use client";

import { Download, Eye, FileText, ImageIcon, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LegalDocument = {
  id: string;
  opportunityId?: string;
  uploadedById?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  publicUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function formatDocumentSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  }
  return `${Math.max(1, Math.round(size / 1024))} Ko`;
}

type DocumentRowProps = {
  document: LegalDocument;
  progress?: number;
  isUploading?: boolean;
  canPreview?: boolean;
  onPreview?: (document: LegalDocument) => void;
  onDownload?: (document: LegalDocument) => void;
  onDelete?: (document: LegalDocument) => void;
  className?: string;
};

export function DocumentRow({
  document,
  progress,
  isUploading = false,
  canPreview = true,
  onPreview,
  onDownload,
  onDelete,
  className,
}: DocumentRowProps) {
  const isImage = document.mimeType.startsWith("image/");
  const icon = isImage ? <ImageIcon className="h-5 w-5 text-primary" aria-hidden="true" /> : <FileText className="h-5 w-5 text-amber-600" aria-hidden="true" />;
  const progressValue = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : 0;

  const showPreviewButton = !isUploading && canPreview && !!onPreview;
  const showDownloadButton = !isUploading && !!onDownload;
  const showDeleteButton = !isUploading && !!onDelete;

  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{document.originalName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {document.mimeType === "application/pdf" ? "PDF" : "Image"} · {formatDocumentSize(document.size)}
          </p>
          {isUploading ? (
            <div className="mt-3" role="status" aria-live="polite" aria-label={`Upload en cours ${Math.round(progressValue)}%`}>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressValue}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Upload en cours… {Math.round(progressValue)}%</p>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
          {showPreviewButton ? (
            <Button type="button" variant="outline" size="sm" className="min-h-11 px-3 sm:px-4" onClick={() => onPreview?.(document)} aria-label={`Aperçu de ${document.originalName}`}>
              <Eye className="h-4 w-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Aperçu</span>
            </Button>
          ) : null}
          {showDownloadButton ? (
            <Button type="button" variant="outline" size="sm" className="min-h-11 px-3 sm:px-4" onClick={() => onDownload?.(document)} aria-label={`Télécharger ${document.originalName}`}>
              <Download className="h-4 w-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Télécharger</span>
            </Button>
          ) : null}
          {showDeleteButton ? (
            <Button type="button" variant="destructive" size="sm" className="min-h-11 w-11 flex items-center justify-center p-0" onClick={() => onDelete?.(document)} aria-label={`Supprimer ${document.originalName}`}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Loader2, Play, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { DocumentRow, type LegalDocument } from "@/components/features/deals/document-row";
import { OpportunityStatusBadge } from "@/components/features/admin/opportunity-status-badge";
import { cn } from "@/lib/utils";
import type { VerificationStatusInput } from "@/lib/validations";

const noteSchema = z.object({
  note: z.string().max(2000, "La note ne doit pas dépasser 2000 caractères"),
});

type NoteForm = z.infer<typeof noteSchema>;

export type AdminOpportunity = {
  id: string;
  title: string;
  description: string;
  category: string;
  amount: number | null;
  verificationStatus: VerificationStatusInput;
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
  rejectionNote: string | null;
  reviewNotes: string | null;
  adminNote: string | null;
  author: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  documents: LegalDocument[];
  documentCount: number;
  requiresDoubleVerification: boolean;
  approvalCount: number;
  currentAdminApproved: boolean;
};

type OpportunityDetailSheetProps = {
  opportunity: AdminOpportunity | null;
  open: boolean;
  isMutating: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onAction: (id: string, action: "verify" | "reject" | "start_review", note?: string) => Promise<void>;
};

const CATEGORY_LABELS: Record<string, string> = {
  INVESTISSEMENT: "Investissement",
  BUSINESS: "Business",
  PARTENARIAT: "Partenariat",
  IMMOBILIER: "Immobilier",
};

const amountFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "IB";
}

export function OpportunityDetailSheet({ opportunity, open, isMutating, error, onOpenChange, onAction }: OpportunityDetailSheetProps) {
  const [previewDocument, setPreviewDocument] = useState<LegalDocument | null>(null);
  const form = useForm<NoteForm>({
    resolver: zodResolver(noteSchema),
    defaultValues: { note: "" },
  });

  const note = useWatch({ control: form.control, name: "note" });

  useEffect(() => {
    form.reset({ note: opportunity?.rejectionNote ?? "" });
  }, [form, opportunity?.id, opportunity?.rejectionNote]);

  if (!opportunity) return null;

  const amount = opportunity.amount !== null ? amountFormatter.format(opportunity.amount) : "Montant non précisé";
  const previewUrl = previewDocument ? `/api/opportunities/${opportunity.id}/documents/${previewDocument.id}/preview` : "";
  const canStartReview = opportunity.verificationStatus === "PENDING";
  const canDecide = opportunity.verificationStatus === "PENDING" || opportunity.verificationStatus === "EN_COURS";
  const doubleVerificationMessage = opportunity.requiresDoubleVerification
    ? `Double vérification requise (${opportunity.approvalCount}/2)`
    : "Vérification simple";
  const isWaitingForSecondAdmin = opportunity.requiresDoubleVerification
    ? opportunity.approvalCount === 1
      ? opportunity.verificationStatus === "EN_COURS"
      : false
    : false;
  const cannotVerifyAgain = opportunity.requiresDoubleVerification
    ? opportunity.currentAdminApproved
      ? opportunity.approvalCount < 2
      : false
    : false;

  const submitReject = form.handleSubmit(async (values) => {
    if (!values.note.trim()) {
      form.setError("note", { message: "La note est obligatoire pour refuser un deal." });
      return;
    }
    await onAction(opportunity.id, "reject", values.note.trim());
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setPreviewDocument(null);
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent className="inset-0 h-full w-full overflow-y-auto p-0 sm:max-w-2xl lg:inset-y-0 lg:right-0 lg:left-auto lg:w-3/4" side="right">
        <SheetHeader className="border-b p-5 pr-14">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-xl">{opportunity.title}</SheetTitle>
              <SheetDescription>
                Soumis le {new Date(opportunity.createdAt).toLocaleDateString("fr-FR")}
              </SheetDescription>
            </div>
            <OpportunityStatusBadge status={opportunity.verificationStatus} />
          </div>
        </SheetHeader>

        <div className="space-y-6 p-5">
          <section className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-md bg-muted px-3 py-1">{CATEGORY_LABELS[opportunity.category] ?? opportunity.category}</span>
              <span className="rounded-md bg-primary/10 px-3 py-1 font-semibold text-primary">{amount}</span>
              <span className="rounded-md bg-amber-50 px-3 py-1 font-medium text-amber-700">{doubleVerificationMessage}</span>
            </div>
            {isWaitingForSecondAdmin ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                En attente d&apos;un second admin pour finaliser la vérification.
              </p>
            ) : null}
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{opportunity.description}</p>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold">Auteur</h3>
            <div className="mt-3 flex items-center gap-3">
              <Avatar size="lg">
                <AvatarImage src={opportunity.author.image ?? undefined} alt={opportunity.author.name} />
                <AvatarFallback>{initials(opportunity.author.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium">{opportunity.author.name}</p>
                <p className="truncate text-sm text-muted-foreground">{opportunity.author.email}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Documents juridiques</h3>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                {opportunity.documentCount}
              </span>
            </div>
            {opportunity.documents.length > 0 ? (
              <div className="mt-3 space-y-3">
                {opportunity.documents.map((document) => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    onPreview={(doc) => setPreviewDocument(doc)}
                    onDownload={(doc) => window.open(`/api/opportunities/${opportunity.id}/documents/${doc.id}/download`, "_blank", "noopener,noreferrer")}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-muted p-4 text-sm text-muted-foreground">Aucun document juridique joint.</p>
            )}

            {previewDocument ? (
              <div className="mt-4 rounded-xl border bg-background p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">Aperçu — {previewDocument.originalName}</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewDocument(null)}>
                    <X className="mr-2 h-4 w-4" aria-hidden="true" />
                    Fermer
                  </Button>
                </div>
                {previewDocument.mimeType.startsWith("image/") ? (
                  <Image src={previewUrl} alt={previewDocument.originalName} width={900} height={520} unoptimized className="max-h-[520px] w-full rounded-lg object-contain" />
                ) : previewDocument.mimeType === "application/pdf" ? (
                  <iframe src={previewUrl} title={`Aperçu ${previewDocument.originalName}`} className="h-[520px] w-full rounded-lg border" />
                ) : (
                  <Button type="button" variant="outline" onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}>
                    Ouvrir l&apos;aperçu
                  </Button>
                )}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold">Actions de vérification</h3>
            <form className="mt-3 space-y-3" onSubmit={submitReject}>
              <div>
                <label htmlFor="rejection-note" className="text-sm font-medium">
                  Note admin / justification du refus
                </label>
                <Textarea id="rejection-note" className="mt-2 min-h-28" placeholder="Expliquez les corrections attendues avant publication…" {...form.register("note")} />
                {form.formState.errors.note ? (
                  <p className="mt-1 text-sm text-destructive">{form.formState.errors.note.message}</p>
                ) : null}
              </div>

              {error ? <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {canStartReview ? (
                  <Button type="button" variant="outline" disabled={isMutating} onClick={() => onAction(opportunity.id, "start_review", note?.trim() ? note.trim() : undefined)}>
                    {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="mr-2 h-4 w-4" aria-hidden="true" />}
                    Marquer en cours
                  </Button>
                ) : null}
                {canDecide ? (
                  <Button
                    type="button"
                    className="bg-green-600 text-white hover:bg-green-700"
                    disabled={isMutating || cannotVerifyAgain}
                    title={cannotVerifyAgain ? "Un second admin distinct doit valider ce deal." : undefined}
                    onClick={() => onAction(opportunity.id, "verify", note?.trim() ? note.trim() : undefined)}
                  >
                    {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Vérifier
                  </Button>
                ) : null}
                {cannotVerifyAgain ? (
                  <p className="basis-full text-sm text-muted-foreground">Un second admin distinct doit valider ce deal.</p>
                ) : null}
                {canDecide ? (
                  <Button type="submit" variant="destructive" disabled={isMutating}>
                    {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Rejeter
                  </Button>
                ) : null}
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
              </div>
            </form>
          </section>

          {opportunity.reviewNotes ? (
            <section className="rounded-xl border bg-muted/40 p-4">
              <h3 className="font-semibold">Notes de revue internes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{opportunity.reviewNotes}</p>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function adminOpportunityAmount(amount: number | null) {
  return amount !== null ? amountFormatter.format(amount) : "Montant non précisé";
}

export function adminOpportunityCategory(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

export function adminOpportunityCardClass(status: VerificationStatusInput) {
  return cn(
    "border-l-4",
    status === "PENDING" ? "border-l-amber-400" : status === "EN_COURS" ? "border-l-blue-400" : status === "VERIFIED" ? "border-l-green-400" : "border-l-red-400",
  );
}

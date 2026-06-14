"use client";

import { useForm, type FieldValues, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { opportunityCreateSchema, type OpportunityCreateInput } from "@/lib/validations";
import { type MembershipTier } from "@/lib/tier-config";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentUploadSection, uploadPendingLegalDocuments } from "@/components/features/deals/document-upload-section";
import { TagInput } from "@/components/features/tags/tag-input";

const CATEGORIES = [
  { value: "INVESTISSEMENT", label: "Investissement" },
  { value: "BUSINESS", label: "Business" },
  { value: "PARTENARIAT", label: "Partenariat" },
  { value: "IMMOBILIER", label: "Immobilier" },
] as const;

const REQUIRED_TIERS: { value: MembershipTier; label: string; description: string }[] = [
  { value: "AFFRANCHI", label: "Affranchi (29€/mois)", description: "Visible par tous les membres" },
  { value: "GRAND_FRERE", label: "Grand Frère (49€/mois)", description: "Visible par les Grands Frères et Boss" },
  { value: "BOSS", label: "Boss (99€/mois)", description: "Visible uniquement par les Boss" },
];

export default function NewOpportunityPage() {
  const router = useRouter();
  const [pendingDocuments, setPendingDocuments] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OpportunityCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(opportunityCreateSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      category: "BUSINESS",
      amount: undefined,
      currency: "EUR",
      requiredTier: "AFFRANCHI",
      tags: [],
    },
  });

  const selectedCategory = watch("category");
  const selectedTier = watch("requiredTier") ?? "AFFRANCHI";
  const tagsValue = watch("tags") ?? [];

  const onSubmit: SubmitHandler<OpportunityCreateInput> = async (data) => {
    const numericAmount = typeof data.amount === "number" ? data.amount : null;

    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          category: data.category,
          amount: numericAmount,
          currency: data.currency ?? "EUR",
          requiredTier: data.requiredTier ?? "AFFRANCHI",
          tags: data.tags ?? [],
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        toast.error(body.error ?? "Erreur lors de la création");
        return;
      }

      const opportunity = (await res.json()) as { id: string };

      if (pendingDocuments.length > 0) {
        try {
          await uploadPendingLegalDocuments(opportunity.id, pendingDocuments);
          toast.success("Documents attachés avec succès.");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Deal créé, mais certains documents n'ont pas été attachés.");
          router.push(`/dashboard/opportunities/${opportunity.id}`);
          return;
        }
      }

      toast.success("Deal soumis avec succès. Notre équipe le vérifie sous 48h.");
      router.push("/dashboard/opportunities");
    } catch {
      toast.error("Erreur réseau. Veuillez réessayer.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Publier une opportunité</h1>
      <p className="mt-1 text-muted-foreground">
        Partage une opportunité business avec la communauté
      </p>

      <form data-testid="opportunity-form" onSubmit={handleSubmit(onSubmit as SubmitHandler<FieldValues>)} className="mt-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            data-testid="opportunity-title-input"
            placeholder="Ex: Restaurant franchise à Abidjan"
            {...register("title")}
          />
          {errors.title ? (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Catégorie</Label>
          <Select
            value={selectedCategory}
            onValueChange={(val) =>
              setValue("category", val as OpportunityCreateInput["category"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category ? (
            <p className="text-sm text-destructive">{errors.category.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="requiredTier">Visibilité</Label>
          <Select
            value={selectedTier}
            onValueChange={(val) =>
              setValue("requiredTier", val as OpportunityCreateInput["requiredTier"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="requiredTier">
              <SelectValue placeholder="Choisir la visibilité" />
            </SelectTrigger>
            <SelectContent>
              {REQUIRED_TIERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {REQUIRED_TIERS.find((t) => t.value === selectedTier)?.description}
          </p>
          {errors.requiredTier ? (
            <p className="text-sm text-destructive">{errors.requiredTier.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Montant (optionnel)</Label>
          <Input
            id="amount"
            data-testid="opportunity-amount-input"
            type="number"
            step="0.01"
            placeholder="50000"
            {...register("amount", { valueAsNumber: true })}
          />
          {errors.amount ? (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Devise</Label>
          <select
            id="currency"
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            {...register("currency")}
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            data-testid="opportunity-description-input"
            rows={6}
            placeholder="Décris l'opportunité en détail..."
            {...register("description")}
          />
          {errors.description ? (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          ) : null}
        </div>

        <DocumentUploadSection onPendingFilesChange={setPendingDocuments} />

        <TagInput
          value={tagsValue}
          onChange={(tags) => setValue("tags", tags, { shouldDirty: true, shouldValidate: true })}
          description="Taguez le deal pour aider les membres à le retrouver par secteur, montant et localisation."
        />

        <Button type="submit" data-testid="opportunity-submit-button" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Publication..." : "Publier l'opportunité"}
        </Button>
      </form>
    </div>
  );
}
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { companyCreateSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";

const PUBLISH_LABELS: Record<string, string> = {
  false: "Brouillon",
  true: "Publié",
};

type FormValues = z.infer<typeof companyCreateSchema>;

type CompanyFormProps = {
  initialData?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    logoUrl?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    website?: string | null;
    location?: string | null;
    certifications?: string | null;
    sectors?: string | null;
    isPublished: boolean;
  } | null;
};

export default function CompanyForm({ initialData }: CompanyFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(companyCreateSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      logoUrl: initialData?.logoUrl ?? "",
      contactName: initialData?.contactName ?? "",
      contactPhone: initialData?.contactPhone ?? "",
      contactEmail: initialData?.contactEmail ?? "",
      website: initialData?.website ?? "",
      location: initialData?.location ?? "",
      certifications: initialData?.certifications ?? "",
      sectors: initialData?.sectors ?? "",
      isPublished: initialData?.isPublished ?? false,
    },
  });

  const isPublishedValue = watch("isPublished") ?? false;

  useEffect(() => {
    if (initialData) {
      setValue("isPublished", initialData.isPublished, { shouldValidate: true });
    }
  }, [initialData, setValue]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/companies/${initialData.id}` : "/api/companies";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        name: data.name,
        description: data.description,
        logoUrl: data.logoUrl || null,
        contactName: data.contactName || null,
        contactPhone: data.contactPhone || null,
        contactEmail: data.contactEmail || null,
        website: data.website || null,
        location: data.location || null,
        certifications: data.certifications || null,
        sectors: data.sectors || null,
        isPublished: data.isPublished ?? isPublishedValue,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = "Une erreur est survenue lors de l'enregistrement.";
        try {
          const body = await res.json();
          errMsg = body.error ?? errMsg;
        } catch {}
        toast.error(errMsg);
        return;
      }

      toast.success(
        isEdit ? "Entreprise mise à jour avec succès." : "Entreprise créée avec succès."
      );
      router.push("/admin/companies");
      router.refresh();
    } catch {
      toast.error("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (published: boolean) => {
    return published ? (
      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800">
        Publié
      </Badge>
    ) : (
      <Badge variant="secondary">Brouillon</Badge>
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 max-w-4xl"
      data-testid="company-form"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nom de l'entreprise</Label>
          <Input
            id="name"
            data-testid="company-name-input"
            placeholder="Ex: KS Construction"
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sectors">Secteurs d'activité (séparés par des virgules)</Label>
          <Input
            id="sectors"
            data-testid="company-sectors-input"
            placeholder="Ex: BTP, Construction, Immobilier"
            {...register("sectors")}
          />
          {errors.sectors ? (
            <p className="text-sm text-destructive">{errors.sectors.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          data-testid="company-description-input"
          placeholder="Décrivez l'entreprise, ses activités, son expertise..."
          className="min-h-32"
          {...register("description")}
        />
        {errors.description ? (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="logoUrl">URL du logo (optionnel)</Label>
          <Input
            id="logoUrl"
            data-testid="company-logo-url-input"
            placeholder="/uploads/logo-ks.jpg ou https://exemple.com/logo.jpg"
            {...register("logoUrl")}
          />
          {errors.logoUrl ? (
            <p className="text-sm text-destructive">{errors.logoUrl.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Site web (optionnel)</Label>
          <Input
            id="website"
            data-testid="company-website-input"
            placeholder="Ex: https://www.ksconstruction.ci"
            {...register("website")}
          />
          {errors.website ? (
            <p className="text-sm text-destructive">{errors.website.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="location">Localisation (optionnel)</Label>
          <Input
            id="location"
            data-testid="company-location-input"
            placeholder="Ex: Abidjan, Cocody"
            {...register("location")}
          />
          {errors.location ? (
            <p className="text-sm text-destructive">{errors.location.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="certifications">Certifications / Agréments (optionnel)</Label>
          <Input
            id="certifications"
            data-testid="company-certifications-input"
            placeholder="Ex: ISO 9001, Agrément Ministère de la Construction"
            {...register("certifications")}
          />
          {errors.certifications ? (
            <p className="text-sm text-destructive">{errors.certifications.message}</p>
          ) : null}
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-4">Informations de Contact (Interne / Admin)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="contactName">Nom du contact</Label>
            <Input
              id="contactName"
              data-testid="company-contact-name-input"
              placeholder="Ex: Jean Koffi"
              {...register("contactName")}
            />
            {errors.contactName ? (
              <p className="text-sm text-destructive">{errors.contactName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Téléphone du contact</Label>
            <Input
              id="contactPhone"
              data-testid="company-contact-phone-input"
              placeholder="Ex: +225 07 00 00 00 00"
              {...register("contactPhone")}
            />
            {errors.contactPhone ? (
              <p className="text-sm text-destructive">{errors.contactPhone.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email du contact</Label>
            <Input
              id="contactEmail"
              data-testid="company-contact-email-input"
              placeholder="Ex: contact@ksconstruction.ci"
              {...register("contactEmail")}
            />
            {errors.contactEmail ? (
              <p className="text-sm text-destructive">{errors.contactEmail.message}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
        <div className="space-y-2">
          <Label htmlFor="isPublished">Statut</Label>
          <div className="flex items-center gap-4">
            <Select
              value={isPublishedValue ? "true" : "false"}
              onValueChange={(val) => {
                const boolVal = val === "true";
                setValue("isPublished", boolVal, { shouldValidate: true });
              }}
            >
              <SelectTrigger id="isPublished" data-testid="company-published-trigger">
                <SelectValue placeholder="Choisir un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">{PUBLISH_LABELS.false}</SelectItem>
                <SelectItem value="true">{PUBLISH_LABELS.true}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Aperçu :</span>
              {renderStatusBadge(isPublishedValue)}
            </div>
          </div>
          {errors.isPublished ? (
            <p className="text-sm text-destructive">{errors.isPublished.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => router.push("/admin/companies")}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="min-h-11"
          disabled={isSubmitting}
          data-testid="company-submit-button"
        >
          {isSubmitting ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Créer l'entreprise"}
        </Button>
      </div>
    </form>
  );
}

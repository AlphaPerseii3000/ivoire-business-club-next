"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { expertCreateSchema } from "@/lib/validations";
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

const TIER_LABELS: Record<string, string> = {
  AFFRANCHI: "Affranchi",
  GRAND_FRERE: "Grand Frère",
  BOSS: "Boss",
};

const PUBLISH_LABELS: Record<string, string> = {
  false: "Brouillon",
  true: "Publié",
};

type FormValues = z.infer<typeof expertCreateSchema>;

type ExpertFormProps = {
  initialData?: {
    id: string;
    name: string;
    title: string;
    bio: string;
    photoUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    whatsapp?: string | null;
    specialties?: string | null;
    requiredTier: string;
    isPublished: boolean;
  } | null;
};

export default function ExpertForm({ initialData }: ExpertFormProps) {
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
    resolver: zodResolver(expertCreateSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      title: initialData?.title ?? "",
      bio: initialData?.bio ?? "",
      photoUrl: initialData?.photoUrl ?? "",
      phone: initialData?.phone ?? "",
      email: initialData?.email ?? "",
      whatsapp: initialData?.whatsapp ?? "",
      specialties: initialData?.specialties ?? "",
      requiredTier: (initialData?.requiredTier as FormValues["requiredTier"]) ?? "AFFRANCHI",
      isPublished: initialData?.isPublished ?? false,
    },
  });

  const tierValue = watch("requiredTier") ?? "AFFRANCHI";
  const isPublishedValue = watch("isPublished") ?? false;

  useEffect(() => {
    if (initialData) {
      setValue("requiredTier", initialData.requiredTier as FormValues["requiredTier"], { shouldValidate: true });
      setValue("isPublished", initialData.isPublished, { shouldValidate: true });
    }
  }, [initialData, setValue]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/experts/${initialData.id}` : "/api/experts";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        name: data.name,
        title: data.title,
        bio: data.bio,
        photoUrl: data.photoUrl || null,
        phone: data.phone || null,
        email: data.email || null,
        whatsapp: data.whatsapp || null,
        specialties: data.specialties || null,
        requiredTier: data.requiredTier ?? tierValue,
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
        isEdit ? "Expert mis à jour avec succès." : "Expert créé avec succès."
      );
      router.push("/admin/experts");
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
      data-testid="expert-form"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nom complet</Label>
          <Input
            id="name"
            data-testid="expert-name-input"
            placeholder="Ex: Jean Koffi"
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Titre / Fonction</Label>
          <Input
            id="title"
            data-testid="expert-title-input"
            placeholder="Ex: Consultant en Stratégie Financière"
            {...register("title")}
          />
          {errors.title ? (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Biographie</Label>
        <Textarea
          id="bio"
          data-testid="expert-bio-input"
          placeholder="Décrivez le parcours de l'expert, ses compétences clés..."
          className="min-h-32"
          {...register("bio")}
        />
        {errors.bio ? (
          <p className="text-sm text-destructive">{errors.bio.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="photoUrl">URL de la photo (optionnel)</Label>
          <Input
            id="photoUrl"
            data-testid="expert-photo-url-input"
            placeholder="/uploads/jean-koffi.jpg ou https://exemple.com/photo.jpg"
            {...register("photoUrl")}
          />
          {errors.photoUrl ? (
            <p className="text-sm text-destructive">{errors.photoUrl.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialties">Spécialités (optionnel, séparées par des virgules)</Label>
          <Input
            id="specialties"
            data-testid="expert-specialties-input"
            placeholder="Ex: Immobilier, Fiscalité, Levée de fonds"
            {...register("specialties")}
          />
          {errors.specialties ? (
            <p className="text-sm text-destructive">{errors.specialties.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone (optionnel)</Label>
          <Input
            id="phone"
            data-testid="expert-phone-input"
            placeholder="Ex: +225 07 00 00 00 00"
            {...register("phone")}
          />
          {errors.phone ? (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail (optionnel)</Label>
          <Input
            id="email"
            data-testid="expert-email-input"
            placeholder="Ex: expert@ivoire-business-club.com"
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp (optionnel)</Label>
          <Input
            id="whatsapp"
            data-testid="expert-whatsapp-input"
            placeholder="Ex: +225 07 00 00 00 00"
            {...register("whatsapp")}
          />
          {errors.whatsapp ? (
            <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="requiredTier">Niveau d'abonnement requis</Label>
          <Select
            value={tierValue}
            onValueChange={(val) => {
              if (val) {
                setValue("requiredTier", val as FormValues["requiredTier"], { shouldValidate: true });
              }
            }}
          >
            <SelectTrigger id="requiredTier" data-testid="expert-tier-trigger">
              <SelectValue placeholder="Choisir un niveau d'abonnement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AFFRANCHI">{TIER_LABELS.AFFRANCHI}</SelectItem>
              <SelectItem value="GRAND_FRERE">{TIER_LABELS.GRAND_FRERE}</SelectItem>
              <SelectItem value="BOSS">{TIER_LABELS.BOSS}</SelectItem>
            </SelectContent>
          </Select>
          {errors.requiredTier ? (
            <p className="text-sm text-destructive">{errors.requiredTier.message}</p>
          ) : null}
        </div>

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
              <SelectTrigger id="isPublished" data-testid="expert-published-trigger">
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
          onClick={() => router.push("/admin/experts")}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="min-h-11"
          disabled={isSubmitting}
          data-testid="expert-submit-button"
        >
          {isSubmitting ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Créer l'expert"}
        </Button>
      </div>
    </form>
  );
}

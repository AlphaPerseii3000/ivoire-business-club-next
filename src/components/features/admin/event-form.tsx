"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eventImagePathSchema, eventPricingSchema, eventCreateSchema } from "@/lib/validations";

const toISOdatetime = (val: unknown) => {
  if (typeof val !== "string") return val;
  if (val === "") return val;
  if (val.endsWith("Z") || val.includes("+")) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toISOString();
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  CANCELLED: "Annulé",
};

const eventFormSchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères").max(200, "Le titre ne doit pas dépasser 200 caractères"),
  description: z.string().trim().min(10, "La description doit contenir au moins 10 caractères").max(5000, "La description ne doit pas dépasser 5000 caractères"),
  startDate: z.preprocess(toISOdatetime, z.string().datetime("Date de début invalide")),
  endDate: z.preprocess(toISOdatetime, z.string().datetime("Date de fin invalide").optional().nullable().or(z.literal(""))),
  eventType: z.enum(["ONLINE", "IN_PERSON"]).default("IN_PERSON"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  location: z.string().trim().max(200, "Le lieu ne doit pas dépasser 200 caractères").optional().nullable().or(z.literal("")),
  onlineUrl: z
    .string()
    .trim()
    .url("URL de visioconférence invalide")
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("")),
  maxCapacity: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().positive("La capacité doit être un nombre entier positif").nullable().optional()
  ),
  coverImagePath: eventImagePathSchema,
  pricing: eventPricingSchema,
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
}).refine(
  (data) => {
    if (!data.endDate) return true;
    const start = new Date(data.startDate).getTime();
    const end = new Date(data.endDate).getTime();
    return end >= start;
  },
  { message: "La date de fin doit être postérieure ou égale à la date de début", path: ["endDate"] }
).refine(
  (data) => data.eventType !== "IN_PERSON" || (data.location && data.location.trim().length > 0),
  { message: "Le lieu est requis pour un événement en présentiel", path: ["location"] }
).refine(
  (data) => data.eventType !== "ONLINE" || (data.onlineUrl && data.onlineUrl.trim().length > 0),
  { message: "Le lien visio est requis pour un événement en ligne", path: ["onlineUrl"] }
);

type FormValues = z.infer<typeof eventFormSchema>;

type EventFormProps = {
  initialData?: {
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string | null;
    location?: string | null;
    coverImagePath?: string | null;
    eventType?: string;
    visibility?: string;
    onlineUrl?: string | null;
    maxCapacity?: number | null;
    pricing?: Record<string, number | null> | null;
    status?: string;
  } | null;
};

function formatDateTimeLocalInput(dateString: string | Date | null) {
  if (!dateString) return "";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  const iso = date.toISOString();
  return iso.slice(0, 16);
}

function formatCurrencyInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function parsePricingTier(value: string): number | null {
  if (value === "") return null;
  const num = Number(value);
  if (isNaN(num) || num < 0) return null;
  return num;
}

function normalizePricing(pricing?: Record<string, number | null> | null): Record<"visitor" | "affranchi" | "grand_frere" | "boss", number | null> | null {
  if (!pricing) return null;
  const tiers = ["visitor", "affranchi", "grand_frere", "boss"] as const;
  const normalized: Record<"visitor" | "affranchi" | "grand_frere" | "boss", number | null> = {
    visitor: null,
    affranchi: null,
    grand_frere: null,
    boss: null,
  };
  let hasValue = false;
  for (const tier of tiers) {
    const val = pricing[tier];
    if (val === undefined || val === null || val === 0) {
      normalized[tier] = null;
    } else {
      normalized[tier] = val;
      hasValue = true;
    }
  }
  return hasValue ? normalized : null;
}

export default function EventForm({ initialData }: EventFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(initialData?.coverImagePath ?? null);

  const [eventTypeValue, setEventTypeValue] = useState(initialData?.eventType ?? "IN_PERSON");
  const [visibilityValue, setVisibilityValue] = useState(initialData?.visibility ?? "PUBLIC");
  const [statusValue, setStatusValue] = useState(initialData?.status ?? "DRAFT");

  const normalizedPricing = normalizePricing(initialData?.pricing ?? null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(eventFormSchema) as any,
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      startDate: formatDateTimeLocalInput(initialData?.startDate ?? null),
      endDate: formatDateTimeLocalInput(initialData?.endDate ?? null),
      eventType: (initialData?.eventType as any) ?? "IN_PERSON",
      visibility: (initialData?.visibility as any) ?? "PUBLIC",
      location: initialData?.location ?? "",
      onlineUrl: initialData?.onlineUrl ?? "",
      maxCapacity: initialData?.maxCapacity ?? null,
      coverImagePath: initialData?.coverImagePath ?? "",
      pricing: normalizedPricing,
      status: (initialData?.status as any) ?? "DRAFT",
    },
  });

  useEffect(() => {
    if (initialData?.eventType) {
      setEventTypeValue(initialData.eventType);
      setValue("eventType", initialData.eventType as any, { shouldValidate: true });
    }
    if (initialData?.visibility) {
      setVisibilityValue(initialData.visibility);
      setValue("visibility", initialData.visibility as any, { shouldValidate: true });
    }
    if (initialData?.status) {
      setStatusValue(initialData.status);
      setValue("status", initialData.status as any, { shouldValidate: true });
    }
    if (initialData?.coverImagePath) {
      setCoverPath(initialData.coverImagePath);
      setValue("coverImagePath", initialData.coverImagePath, { shouldValidate: false });
    }
  }, [initialData?.eventType, initialData?.visibility, initialData?.status, initialData?.coverImagePath, setValue]);

  const watchedEventType = watch("eventType");
  const isInPerson = watchedEventType === "IN_PERSON";
  const isOnline = watchedEventType === "ONLINE";

  async function uploadCover(eventId: string, file: File): Promise<string | null> {
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("cover", file);
      const res = await fetch(`/api/admin/events/${eventId}/cover`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        let errMsg = "Une erreur est survenue lors de l'upload de la couverture.";
        try {
          const body = await res.json();
          errMsg = body.error ?? errMsg;
        } catch {}
        setUploadError(errMsg);
        toast.error(errMsg);
        return null;
      }
      const body = await res.json();
      const path = body.data?.coverImagePath ?? null;
      if (path) {
        setCoverPath(path);
        setValue("coverImagePath", path, { shouldValidate: false });
        toast.success("Couverture uploadée avec succès.");
      }
      return path;
    } catch {
      const errMsg = "Erreur réseau lors de l'upload de la couverture.";
      setUploadError(errMsg);
      toast.error(errMsg);
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  async function validateCoverFile(file: File): Promise<boolean> {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      const errMsg = "Format non supporté. Utilisez jpeg, png ou webp.";
      setUploadError(errMsg);
      toast.error(errMsg);
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      const errMsg = "Le fichier dépasse 5 Mo.";
      setUploadError(errMsg);
      toast.error(errMsg);
      return false;
    }
    return true;
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const valid = await validateCoverFile(file);
    if (!valid) {
      setCoverFile(null);
      setCoverPreview(null);
      return;
    }
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/events/${initialData?.id}` : "/api/events";
      const method = isEdit ? "PUT" : "POST";

      const pricing = normalizePricing(data.pricing ?? null);

      const payload = {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate || null,
        eventType: data.eventType,
        visibility: data.visibility,
        location: data.location || null,
        onlineUrl: data.onlineUrl || null,
        maxCapacity: data.maxCapacity ?? null,
        coverImagePath: coverPath,
        pricing,
        ...(isEdit ? { status: data.status ?? statusValue } : {}),
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

      const saved = await res.json();
      const savedId = saved?.id ?? initialData?.id;

      if (coverFile && savedId) {
        await uploadCover(savedId, coverFile);
      }

      toast.success(
        isEdit ? "Événement modifié avec succès." : "Événement créé avec succès en tant que brouillon."
      );
      router.push("/admin/events");
      router.refresh();
    } catch {
      toast.error("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800">
            Publié
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive">
            Annulé
          </Badge>
        );
      default:
        return <Badge variant="secondary">Brouillon</Badge>;
    }
  };

  const canChangeStatus = (currentStatus: string) => {
    return currentStatus !== "CANCELLED";
  };

  const coverUrl = isEdit && coverPath
    ? `/api/media/events/${initialData?.id}/cover`
    : undefined;

  const showCurrentCover = coverUrl ? !coverPreview : false;
  const showNoCoverPlaceholder = !coverPreview ? !Boolean(coverUrl) : false;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 max-w-4xl"
      data-testid="event-form"
    >
      {/* Section 1 — Infos générales */}
      <Card>
        <CardHeader>
          <CardTitle>1. Infos générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              data-testid="event-title-input"
              placeholder="Ex: Soirée Networking IBC Abidjan"
              {...register("title")}
            />
            {errors.title ? (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              data-testid="event-description-input"
              placeholder="Décrivez l'événement, le programme et les informations pratiques..."
              className="min-h-32"
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="eventType">Type d'événement</Label>
              <Select
                value={eventTypeValue}
                onValueChange={(val) => {
                  if (val) {
                    setValue("eventType", val as any, { shouldValidate: true });
                    setEventTypeValue(val);
                  }
                }}
              >
                <SelectTrigger id="eventType" data-testid="event-type-trigger">
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_PERSON">En présentiel</SelectItem>
                  <SelectItem value="ONLINE">En ligne</SelectItem>
                </SelectContent>
              </Select>
              {errors.eventType ? (
                <p className="text-sm text-destructive">{errors.eventType.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibilité</Label>
              <Select
                value={visibilityValue}
                onValueChange={(val) => {
                  if (val) {
                    setValue("visibility", val as any, { shouldValidate: true });
                    setVisibilityValue(val);
                  }
                }}
              >
                <SelectTrigger id="visibility" data-testid="event-visibility-trigger">
                  <SelectValue placeholder="Choisir une visibilité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVATE">Privé (membres)</SelectItem>
                </SelectContent>
              </Select>
              {errors.visibility ? (
                <p className="text-sm text-destructive">{errors.visibility.message}</p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Logistique */}
      <Card>
        <CardHeader>
          <CardTitle>2. Logistique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date et heure de début</Label>
              <Input
                id="startDate"
                type="datetime-local"
                data-testid="event-start-date-input"
                {...register("startDate")}
              />
              {errors.startDate ? (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Date et heure de fin (optionnel)</Label>
              <Input
                id="endDate"
                type="datetime-local"
                data-testid="event-end-date-input"
                {...register("endDate")}
              />
              {errors.endDate ? (
                <p className="text-sm text-destructive">{errors.endDate.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isInPerson ? (
              <div className="space-y-2">
                <Label htmlFor="location">Lieu</Label>
                <Input
                  id="location"
                  data-testid="event-location-input"
                  placeholder="Ex: Abidjan, Cocody"
                  {...register("location")}
                />
                {errors.location ? (
                  <p className="text-sm text-destructive">{errors.location.message}</p>
                ) : null}
              </div>
            ) : null}

            {isOnline ? (
              <div className="space-y-2">
                <Label htmlFor="onlineUrl">Lien visioconférence</Label>
                <Input
                  id="onlineUrl"
                  data-testid="event-online-url-input"
                  placeholder="https://meet.exemple.com/..."
                  {...register("onlineUrl")}
                />
                {errors.onlineUrl ? (
                  <p className="text-sm text-destructive">{errors.onlineUrl.message}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="maxCapacity">Capacité maximale</Label>
              <Input
                id="maxCapacity"
                type="number"
                data-testid="event-max-capacity-input"
                placeholder="Ex: 100"
                {...register("maxCapacity")}
              />
              {errors.maxCapacity ? (
                <p className="text-sm text-destructive">{errors.maxCapacity.message}</p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3 — Couverture */}
      <Card data-testid="event-cover-section">
        <CardHeader>
          <CardTitle>3. Couverture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="cover">Image de couverture (jpeg, png, webp — max 5 Mo)</Label>
            <Input
              id="cover"
              data-testid="event-cover-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverChange}
              disabled={isUploading}
            />
            {uploadError ? (
              <p className="text-sm text-destructive">{uploadError}</p>
            ) : null}
          </div>

          {coverPreview ? (
            <div className="relative aspect-[16/9] w-full max-w-md overflow-hidden rounded-xl border border-border/40">
              <img
                src={coverPreview}
                alt="Aperçu de la couverture"
                className="object-cover w-full h-full"
              />
            </div>
          ) : null}

          {showCurrentCover ? (
            <div className="relative aspect-[16/9] w-full max-w-md overflow-hidden rounded-xl border border-border/40">
              <img
                src={coverUrl}
                alt="Couverture actuelle"
                className="object-cover w-full h-full"
              />
            </div>
          ) : null}

          {showNoCoverPlaceholder ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-muted-foreground">
              <ImageIcon className="size-5" />
              <span className="text-sm">Aucune couverture sélectionnée.</span>
            </div>
          ) : null}

          <input type="hidden" {...register("coverImagePath")} />
          {errors.coverImagePath ? (
            <p className="text-sm text-destructive">{errors.coverImagePath.message}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Section 4 — Tarification */}
      <Card data-testid="event-pricing-section">
        <CardHeader>
          <CardTitle>4. Tarification (FCFA)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Laissez un champ vide ou à 0 pour rendre l'événement gratuit pour ce tier. Si tous les champs sont vides, l'événement est gratuit.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {([
              { key: "visitor", label: "Visiteur" },
              { key: "affranchi", label: "Affranchi" },
              { key: "grand_frere", label: "Grand frère" },
              { key: "boss", label: "Boss" },
            ] as const).map((tier) => (
              <div key={tier.key} className="space-y-2">
                <Label htmlFor={`pricing-${tier.key}`}>{tier.label}</Label>
                <Input
                  id={`pricing-${tier.key}`}
                  data-testid={`event-pricing-${tier.key}-input`}
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={formatCurrencyInput(normalizedPricing?.[tier.key])}
                  onChange={(e) => {
                    const val = parsePricingTier(e.target.value);
                    const current = normalizePricing(getValues("pricing") ?? null) ?? {
                      visitor: null,
                      affranchi: null,
                      grand_frere: null,
                      boss: null,
                    };
                    current[tier.key] = val;
                    setValue("pricing", normalizePricing(current), { shouldValidate: true });
                  }}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          {errors.pricing ? (
            <p className="text-sm text-destructive">{errors.pricing.message}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Section 5 — Publication */}
      {isEdit ? (
        <Card data-testid="event-publication-section">
          <CardHeader>
            <CardTitle>5. Publication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <div className="flex items-center gap-4">
                <Select
                  value={statusValue}
                  onValueChange={(val) => {
                    if (val) {
                      setValue("status", val as any, { shouldValidate: true });
                      setStatusValue(val);
                    }
                  }}
                  disabled={!canChangeStatus(statusValue)}
                >
                  <SelectTrigger id="status" data-testid="event-status-trigger">
                    <SelectValue placeholder="Choisir un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusValue === "DRAFT" ? (
                      <>
                        <SelectItem value="DRAFT">{STATUS_LABELS.DRAFT}</SelectItem>
                        <SelectItem value="PUBLISHED">{STATUS_LABELS.PUBLISHED}</SelectItem>
                      </>
                    ) : statusValue === "PUBLISHED" ? (
                      <>
                        <SelectItem value="PUBLISHED">{STATUS_LABELS.PUBLISHED}</SelectItem>
                        <SelectItem value="CANCELLED">{STATUS_LABELS.CANCELLED}</SelectItem>
                      </>
                    ) : (
                      <SelectItem value="CANCELLED">{STATUS_LABELS.CANCELLED}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Aperçu :</span>
                  {renderStatusBadge(statusValue)}
                </div>
              </div>
              {!canChangeStatus(statusValue) ? (
                <p className="text-sm text-muted-foreground">
                  Un événement annulé ne peut pas être republié depuis l'interface.
                </p>
              ) : null}
              {errors.status ? (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => router.push("/admin/events")}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="min-h-11"
          disabled={isSubmitting || isUploading}
          data-testid="event-submit-button"
        >
          {isUploading ? "Upload en cours..." : isSubmitting ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Créer l'événement"}
        </Button>
      </div>
    </form>
  );
}

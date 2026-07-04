"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { eventImagePathSchema, eventPricingSchema } from "@/lib/validations";
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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  CANCELLED: "Annulé",
};

const toISOdatetime = (val: unknown) => {
  if (typeof val !== "string") return val;
  if (val === "") return val;
  // Already ISO (has timezone suffix)
  if (val.endsWith("Z") || val.includes("+")) return val;
  // datetime-local format: "2026-07-15T18:00" → ISO
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toISOString();
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

export default function EventForm({ initialData }: EventFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventTypeValue, setEventTypeValue] = useState(initialData?.eventType ?? "IN_PERSON");
  const [visibilityValue, setVisibilityValue] = useState(initialData?.visibility ?? "PUBLIC");
  const [statusValue, setStatusValue] = useState(initialData?.status ?? "DRAFT");

  const {
    register,
    handleSubmit,
    setValue,
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
      pricing: initialData?.pricing ?? null,
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
  }, [initialData?.eventType, initialData?.visibility, initialData?.status, setValue]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/events/${initialData.id}` : "/api/events";
      const method = isEdit ? "PUT" : "POST";

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
        coverImagePath: data.coverImagePath || null,
        pricing: data.pricing ?? null,
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
    // Only allow the forward transitions required by the story.
    return currentStatus !== "CANCELLED";
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 max-w-4xl"
      data-testid="event-form"
    >
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div className="space-y-2">
          <Label htmlFor="coverImagePath">Chemin de l'image de couverture (optionnel)</Label>
          <Input
            id="coverImagePath"
            data-testid="event-cover-image-path-input"
            placeholder="https://exemple.com/image.jpg ou /uploads/image.jpg"
            {...register("coverImagePath")}
          />
          {errors.coverImagePath ? (
            <p className="text-sm text-destructive">{errors.coverImagePath.message}</p>
          ) : null}
        </div>
      </div>

      {isEdit ? (
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
          disabled={isSubmitting}
          data-testid="event-submit-button"
        >
          {isSubmitting ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Créer l'événement"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useForm, type FieldValues, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { articleCreateSchema, type ArticleCreateInput, ArticleVisibility } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RichTextEditor from "./rich-text-editor";

const articleFormSchema = articleCreateSchema.extend({
  published: z.boolean().optional(),
});

const CATEGORIES = [
  { value: "conseil", label: "Conseil" },
  { value: "guide", label: "Guide" },
  { value: "témoignage", label: "Témoignage" },
  { value: "actu", label: "Actu" },
] as const;

type ArticleFormProps = {
  initialData?: {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    category: string;
    visibility: ArticleVisibility;
    published: boolean;
    imageUrl?: string | null;
    opportunityId?: string | null;
  } | null;
  opportunities?: { id: string; title: string }[];
};

export default function ArticleForm({ initialData, opportunities = [] }: ArticleFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const standardCategoryValues = CATEGORIES.map((c) => c.value as string);
  const initialCategoryIsCustom =
    initialData?.category && !standardCategoryValues.includes(initialData.category);

  const [categoryType, setCategoryType] = useState<string>(() => {
    if (initialData?.category) {
      return initialCategoryIsCustom ? "custom" : initialData.category;
    }
    return "conseil";
  });

  const [customCategory, setCustomCategory] = useState<string>(() => {
    return initialCategoryIsCustom ? initialData.category : "";
  });

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ArticleCreateInput & { published?: boolean }>({
    resolver: zodResolver(articleFormSchema) as any,
    defaultValues: {
      title: initialData?.title ?? "",
      excerpt: initialData?.excerpt ?? "",
      content: initialData?.content ?? "",
      category: initialData?.category ?? "conseil",
      visibility: initialData?.visibility ?? ArticleVisibility.PUBLIC,
      published: initialData?.published ?? false,
      imageUrl: initialData?.imageUrl ?? "",
      opportunityId: initialData?.opportunityId ?? "",
    },
  });

  const onContentChange = useCallback(
    (markdown: string) => {
      setValue("content", markdown, { shouldValidate: true });
    },
    [setValue]
  );

  const handleInlineUploadForEditor = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/admin/articles/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          let errMsg = "Erreur de téléversement";
          try {
            const errData = await res.json();
            errMsg = errData.error || errMsg;
          } catch {}
          throw new Error(errMsg);
        }

        const { data } = await res.json();
        const cleanFileName = file.name
          .replace(/[\[\]\(\)\*\#\?]/g, "")
          .trim() || "image";
        toast.success("Image en ligne téléversée avec succès.");
        return { url: data.url, alt: cleanFileName };
      } catch (err: any) {
        toast.error(err.message || "Erreur lors du téléversement de l'image en ligne.");
        return null;
      }
    },
    []
  );

  const watchVisibility = watch("visibility");
  const watchCategory = watch("category");
  const watchImageUrl = watch("imageUrl");
  const watchOpportunityId = watch("opportunityId");

  // Sync category type change with react-hook-form category value
  useEffect(() => {
    if (categoryType !== "custom") {
      setValue("category", categoryType, { shouldValidate: true });
    } else {
      setValue("category", customCategory, { shouldValidate: false });
    }
  }, [categoryType, customCategory, setValue]);

  const onSubmit: SubmitHandler<ArticleCreateInput & { published?: boolean }> = async (data) => {
    try {
      const url = isEdit ? `/api/articles/${initialData.id}` : "/api/articles";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        category: data.category,
        visibility: data.visibility,
        imageUrl: data.imageUrl || null,
        opportunityId: data.opportunityId || null,
        ...(isEdit ? { published: data.published } : {}),
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
        isEdit ? "Article modifié avec succès." : "Article créé avec succès en tant que brouillon."
      );
      router.push("/admin/articles");
      router.refresh();
    } catch {
      toast.error("Erreur réseau. Veuillez réessayer.");
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/articles/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errMsg = "Erreur de téléversement";
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const { data } = await res.json();
      setValue("imageUrl", data.url, { shouldValidate: true });
      toast.success("Image de couverture téléversée avec succès.");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du téléversement de l'image de couverture.");
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleInlineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingInline(true);
    try {
      const result = await handleInlineUploadForEditor(file);
      if (result) {
        const markdownTag = `\n![${result.alt}](${result.url})\n`;
        const currentContent = watch("content") || "";
        setValue("content", currentContent + markdownTag, { shouldValidate: true });
      }
    } finally {
      setIsUploadingInline(false);
      if (inlineInputRef.current) inlineInputRef.current.value = "";
    }
  };

  const removeCoverImage = () => {
    setValue("imageUrl", "", { shouldValidate: true });
    toast.info("Image de couverture retirée.");
  };

  // Visibility badge preview styling
  const renderVisibilityBadge = (visibility: ArticleVisibility) => {
    switch (visibility) {
      case ArticleVisibility.PUBLIC:
        return (
          <Badge className="border-neutral-200 bg-neutral-50 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100">
            Public
          </Badge>
        );
      case ArticleVisibility.AFFRANCHI:
        return (
          <Badge className="border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100">
            Affranchi
          </Badge>
        );
      case ArticleVisibility.GRAND_FRERE:
        return (
          <Badge className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            Grand Frère
          </Badge>
        );
      case ArticleVisibility.BOSS:
        return (
          <Badge className="border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100">
            Boss
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit as SubmitHandler<FieldValues>)}
      className="space-y-6 max-w-4xl"
      data-testid="article-form"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          data-testid="article-title-input"
          placeholder="Ex: Les opportunités de l'immobilier à Abidjan"
          {...register("title")}
        />
        {errors.title ? (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Résumé (Excerpt)</Label>
        <Textarea
          id="excerpt"
          data-testid="article-excerpt-input"
          placeholder="Un court résumé de l'article pour les aperçus communautaires..."
          className="min-h-20"
          {...register("excerpt")}
        />
        {errors.excerpt ? (
          <p className="text-sm text-destructive">{errors.excerpt.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="category-select">Catégorie</Label>
          <Select
            value={categoryType}
            onValueChange={(val) => {
              if (val) setCategoryType(val);
            }}
          >
            <SelectTrigger id="category-select" data-testid="article-category-trigger">
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Autre (personnalisé)...</SelectItem>
            </SelectContent>
          </Select>

          {categoryType === "custom" ? (
            <div className="mt-2">
              <Input
                id="custom-category"
                data-testid="article-custom-category-input"
                placeholder="Saisissez la catégorie personnalisée"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          ) : null}

          {errors.category ? (
            <p className="text-sm text-destructive">{errors.category.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="visibility">Visibilité (Tier minimum requis)</Label>
          <div className="flex items-center gap-4">
            <Select
              value={watchVisibility}
              onValueChange={(val) => {
                if (val) {
                  setValue("visibility", val as ArticleVisibility, {
                    shouldValidate: true,
                  });
                }
              }}
            >
              <SelectTrigger id="visibility" data-testid="article-visibility-trigger">
                <SelectValue placeholder="Choisir la visibilité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ArticleVisibility.PUBLIC}>Public</SelectItem>
                <SelectItem value={ArticleVisibility.AFFRANCHI}>Affranchi</SelectItem>
                <SelectItem value={ArticleVisibility.GRAND_FRERE}>Grand Frère</SelectItem>
                <SelectItem value={ArticleVisibility.BOSS}>Boss</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Aperçu :</span>
              {renderVisibilityBadge(watchVisibility)}
            </div>
          </div>
          {errors.visibility ? (
            <p className="text-sm text-destructive">{errors.visibility.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="opportunityId">Opportunité d'investissement liée (optionnel)</Label>
        <Select
          value={watchOpportunityId || "none"}
          onValueChange={(val) => {
            setValue("opportunityId", val === "none" ? "" : val, {
              shouldValidate: true,
            });
          }}
        >
          <SelectTrigger id="opportunityId" data-testid="article-opportunity-trigger">
            <SelectValue placeholder="Associer une opportunité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucune opportunité</SelectItem>
            {opportunities.map((opp) => (
              <SelectItem key={opp.id} value={opp.id}>
                {opp.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.opportunityId ? (
          <p className="text-sm text-destructive">{errors.opportunityId.message}</p>
        ) : null}
      </div>

      {/* Cover Image Upload Section */}
      <div className="space-y-2">
        <Label>Image de couverture (Bannière / Miniature)</Label>
        
        {watchImageUrl ? (
          <div className="relative group rounded-lg overflow-hidden border bg-muted aspect-[21/9] max-h-60 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={watchImageUrl} 
              alt="Couverture" 
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => coverInputRef.current?.click()}
              >
                Changer l'image
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={removeCoverImage}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => coverInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-accent/50 hover:border-accent transition-colors min-h-36 bg-card"
          >
            {isUploadingCover ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Téléversement de l'image...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Cliquez pour téléverser une image de couverture</p>
                <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF jusqu'à 5 Mo</p>
              </>
            )}
          </div>
        )}
        <input 
          type="file" 
          ref={coverInputRef}
          onChange={handleCoverUpload}
          accept="image/*"
          className="hidden"
        />
        <input type="hidden" {...register("imageUrl")} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="content">Contenu</Label>

          {/* Inline Image Uploader Button kept outside editor toolbar for backward layout */}
          <div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-8 gap-1.5"
              onClick={() => inlineInputRef.current?.click()}
              disabled={isUploadingInline}
            >
              {isUploadingInline ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
              {isUploadingInline ? "Téléversement..." : "Insérer une image en ligne"}
            </Button>
            <input
              type="file"
              ref={inlineInputRef}
              onChange={handleInlineUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        <RichTextEditor
          value={watch("content")}
          onChange={onContentChange}
          data-testid="article-content-input"
          onInlineImageUpload={handleInlineUploadForEditor}
        />
        {errors.content ? (
          <p className="text-sm text-destructive">{errors.content.message}</p>
        ) : null}
      </div>

      {isEdit ? (
        <div className="flex items-center gap-2 border p-3 rounded-lg bg-card">
          <input
            id="published"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            {...register("published")}
          />
          <Label htmlFor="published" className="cursor-pointer">
            Publier l'article immédiatement (visible selon les restrictions de tier)
          </Label>
        </div>
      ) : null}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => router.push("/admin/articles")}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="min-h-11"
          disabled={isSubmitting || isUploadingCover || isUploadingInline}
          data-testid="article-submit-button"
        >
          {isSubmitting ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Créer l'article"}
        </Button>
      </div>
    </form>
  );
}

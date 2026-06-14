"use client";

import { useForm, type FieldValues, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { articleCreateSchema, type ArticleCreateInput, ArticleVisibility } from "@/lib/validations";

const articleFormSchema = articleCreateSchema.extend({
  published: z.boolean().optional(),
});
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
  } | null;
};

export default function ArticleForm({ initialData }: ArticleFormProps) {
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
    },
  });

  const watchVisibility = watch("visibility");
  const watchCategory = watch("category");

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
        ...(isEdit ? { published: data.published } : {}),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        toast.error(body.error ?? "Une erreur est survenue lors de l'enregistrement.");
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
        <Label htmlFor="content">Contenu (Markdown)</Label>
        <Textarea
          id="content"
          data-testid="article-content-input"
          placeholder="Rédigez votre article en Markdown ici..."
          className="min-h-80 font-mono text-sm leading-relaxed"
          {...register("content")}
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
          disabled={isSubmitting}
          data-testid="article-submit-button"
        >
          {isSubmitting ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Créer l'article"}
        </Button>
      </div>
    </form>
  );
}

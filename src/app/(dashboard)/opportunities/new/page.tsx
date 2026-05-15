"use client";

import { useForm, type FieldValues, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { opportunityCreateSchema, type OpportunityCreateInput } from "@/lib/validations";
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

const CATEGORIES = [
  { value: "INVESTISSEMENT", label: "Investissement" },
  { value: "BUSINESS", label: "Business" },
  { value: "PARTENARIAT", label: "Partenariat" },
  { value: "IMMOBILIER", label: "Immobilier" },
] as const;

export default function NewOpportunityPage() {
  const router = useRouter();

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
    },
  });

  const selectedCategory = watch("category");

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
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        toast.error(body.error ?? "Erreur lors de la création");
        return;
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

      <form onSubmit={handleSubmit(onSubmit as SubmitHandler<FieldValues>)} className="mt-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
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
          <Label htmlFor="amount">Montant (€, optionnel)</Label>
          <Input
            id="amount"
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
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={6}
            placeholder="Décris l'opportunité en détail..."
            {...register("description")}
          />
          {errors.description ? (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          ) : null}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Publication..." : "Publier l'opportunité"}
        </Button>
      </form>
    </div>
  );
}
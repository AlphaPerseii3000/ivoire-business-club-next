"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { onboardingFormSchema, ALL_COUNTRIES, type OnboardingFormInput } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompleteProfileFormProps {
  defaultValues: {
    fullName: string;
    address: string;
    phone: string;
    country: string;
    email: string;
    duration: string;
    tier: string;
    activity: string;
    goals: string;
    needs: string;
  };
}

const defaultValuesForForm: CompleteProfileFormProps["defaultValues"] = {
  fullName: "",
  address: "",
  phone: "",
  country: "",
  email: "",
  duration: "",
  tier: "",
  activity: "",
  goals: "",
  needs: "",
};

const DURATION_OPTIONS = [
  { value: "MONTHLY", label: "Mensuelle" },
  { value: "SEMESTERIAL", label: "Semestrielle" },
  { value: "ANNUAL", label: "Annuelle" },
] as const;

const TIER_OPTIONS = [
  { value: "AFFRANCHI", label: "Affranchis" },
  { value: "GRAND_FRERE", label: "Grands Frères" },
  { value: "BOSS", label: "Boss" },
] as const;

export default function CompleteProfileForm({ defaultValues }: CompleteProfileFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formDefaultValues = {
    ...defaultValuesForForm,
    ...defaultValues,
    duration: defaultValues.duration as OnboardingFormInput["duration"] || undefined,
    tier: defaultValues.tier as OnboardingFormInput["tier"] || undefined,
    country: defaultValues.country || "",
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingFormInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(onboardingFormSchema) as any,
    mode: "onBlur",
    defaultValues: formDefaultValues,
  });

  const durationValue = watch("duration") as OnboardingFormInput["duration"];
  const tierValue = watch("tier") as OnboardingFormInput["tier"];
  const countryValue = watch("country") as string || "";

  const onSubmit = async (data: OnboardingFormInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status === 401) {
        window.location.href = "/auth/signin";
        return;
      }

      if (!res.ok) {
        const payload = await res.json();
        const hasFieldErrors = res.status === 400 && payload.details;
        if (hasFieldErrors) {
          return;
        }
        toast.error("Erreur lors de la sauvegarde");
        return;
      }

      toast.success("Profil complété. Bienvenue sur IBC !");
      router.push("/dashboard");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" data-testid="complete-profile-form">
      {/* Nom complet */}
      <div className="space-y-2">
        <Label htmlFor="fullName">Nom / Prénom ou Société</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Jean Dupont ou Dupont SARL"
          className="min-h-[44px]"
          {...register("fullName")}
        />
        {errors.fullName ? (
          <p className="text-xs text-destructive">{errors.fullName.message}</p>
        ) : null}
      </div>

      {/* Adresse */}
      <div className="space-y-2">
        <Label htmlFor="address">Adresse</Label>
        <Input
          id="address"
          type="text"
          placeholder="12 rue des Affranchis, 75001 Paris"
          className="min-h-[44px]"
          {...register("address")}
        />
        {errors.address ? (
          <p className="text-xs text-destructive">{errors.address.message}</p>
        ) : null}
      </div>

      {/* Téléphone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          placeholder="+225 XX XX XX XX"
          className="min-h-[44px]"
          {...register("phone")}
        />
        {errors.phone ? (
          <p className="text-xs text-destructive">{errors.phone.message}</p>
        ) : null}
      </div>

      {/* Pays */}
      <div className="space-y-2">
        <Label htmlFor="country">Pays</Label>
        <Select
          value={countryValue}
          onValueChange={(value) => {
            const safeValue = value === "Autre" ? "" : (value || "");
            setValue("country", safeValue as OnboardingFormInput["country"], { shouldValidate: true });
          }}
        >
          <SelectTrigger id="country" className="min-h-[44px] w-full" data-testid="country-trigger">
            <SelectValue placeholder="Sélectionne un pays" />
          </SelectTrigger>
          <SelectContent>
            {ALL_COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
            <SelectItem value="Autre">Autre</SelectItem>
          </SelectContent>
        </Select>
        {errors.country ? (
          <p className="text-xs text-destructive">{errors.country.message}</p>
        ) : null}
      </div>

      {/* Email (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={defaultValues.email}
          disabled
          readOnly
          className="min-h-[44px] bg-muted text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">L&apos;email ne peut pas être modifié</p>
      </div>

      {/* Durée d'adhésion */}
      <div className="space-y-2">
        <Label htmlFor="duration">Durée d&apos;adhésion</Label>
        <Select
          value={durationValue}
          onValueChange={(value) => {
            setValue("duration", value as OnboardingFormInput["duration"], { shouldValidate: true });
          }}
        >
          <SelectTrigger id="duration" className="min-h-[44px] w-full" data-testid="duration-trigger">
            <SelectValue placeholder="Sélectionne une durée" />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.duration ? (
          <p className="text-xs text-destructive">{errors.duration.message}</p>
        ) : null}
      </div>

      {/* Formule choisie */}
      <div className="space-y-2">
        <Label htmlFor="tier">Formule choisie</Label>
        <Select
          value={tierValue}
          onValueChange={(value) => {
            setValue("tier", value as OnboardingFormInput["tier"], { shouldValidate: true });
          }}
        >
          <SelectTrigger id="tier" className="min-h-[44px] w-full" data-testid="tier-trigger">
            <SelectValue placeholder="Sélectionne une formule" />
          </SelectTrigger>
          <SelectContent>
            {TIER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.tier ? (
          <p className="text-xs text-destructive">{errors.tier.message}</p>
        ) : null}
      </div>

      {/* Activité */}
      <div className="space-y-2">
        <Label htmlFor="activity">Activité</Label>
        <textarea
          id="activity"
          rows={3}
          placeholder="Consultant en immobilier, fondateur de startup..."
          maxLength={300}
          className="min-h-[44px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50"
          {...register("activity")}
        />
        {errors.activity ? (
          <p className="text-xs text-destructive">{errors.activity.message}</p>
        ) : null}
      </div>

      {/* Objectifs */}
      <div className="space-y-2">
        <Label htmlFor="goals">Objectifs</Label>
        <textarea
          id="goals"
          rows={4}
          placeholder="Pourquoi rejoins-tu IBC ?"
          maxLength={2000}
          className="min-h-[44px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50"
          {...register("goals")}
        />
        {errors.goals ? (
          <p className="text-xs text-destructive">{errors.goals.message}</p>
        ) : null}
      </div>

      {/* Besoins */}
      <div className="space-y-2">
        <Label htmlFor="needs">Besoins</Label>
        <textarea
          id="needs"
          rows={4}
          placeholder="Que recherches-tu concrètement ?"
          maxLength={2000}
          className="min-h-[44px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50"
          {...register("needs")}
        />
        {errors.needs ? (
          <p className="text-xs text-destructive">{errors.needs.message}</p>
        ) : null}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="min-h-[44px] w-full"
        data-testid="submit-button"
      >
        {isSubmitting ? "Sauvegarde..." : "Finaliser mon adhésion"}
      </Button>
    </form>
  );
}

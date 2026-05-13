"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { profileUpdateSchema, UEMOA_COUNTRIES, type ProfileUpdateInput } from "@/lib/validations";
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

interface ProfileEditFormProps {
  user: {
    name: string;
    email: string;
    bio: string | null;
    phone: string | null;
    location: string | null;
    country: string | null;
  };
}

export default function ProfileEditForm({ user }: ProfileEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    mode: "onBlur",
    defaultValues: {
      name: user.name,
      bio: user.bio ?? "",
      phone: user.phone ?? "",
      location: user.location ?? "",
      country: user.country ?? "",
    },
  });

  const countryValue = watch("country");

  const onSubmit = async (data: ProfileUpdateInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status === 401) {
        window.location.href = "/auth/signin";
        return;
      }

      if (!res.ok) {
        const payload = await res.json();
        if (res.status === 400 && payload.details) {
          // Field-level errors from Zod — already shown via RHF
          return;
        }
        toast.error("Une erreur est survenue");
        return;
      }

      toast.success("Profil mis à jour avec succès.");
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nom complet</Label>
        <Input
          id="name"
          type="text"
          placeholder="Jean Dupont"
          className="min-h-[44px]"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Email (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={user.email}
          disabled
          className="min-h-[44px] bg-muted text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">L&apos;email ne peut pas être modifié</p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <textarea
          id="bio"
          rows={4}
          placeholder="Décris-toi en quelques mots..."
          maxLength={500}
          className="min-h-[44px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50"
          {...register("bio")}
        />
        <p className="text-xs text-muted-foreground">
          {(watch("bio")?.length ?? 0)}/500
        </p>
        {errors.bio && (
          <p className="text-xs text-destructive">{errors.bio.message}</p>
        )}
      </div>

      {/* Phone */}
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
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone.message}</p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Localisation</Label>
        <Input
          id="location"
          type="text"
          placeholder="Abidjan, Côte d'Ivoire"
          className="min-h-[44px]"
          {...register("location")}
        />
        {errors.location && (
          <p className="text-xs text-destructive">{errors.location.message}</p>
        )}
      </div>

      {/* Country */}
      <div className="space-y-2">
        <Label htmlFor="country">Pays</Label>
        <Select
          value={countryValue ?? ""}
          onValueChange={(value) => {
            setValue("country", value, { shouldValidate: true });
          }}
        >
          <SelectTrigger className="min-h-[44px] w-full">
            <SelectValue placeholder="Sélectionne un pays" />
          </SelectTrigger>
          <SelectContent>
            {UEMOA_COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
            <SelectItem value="Autre">Autre</SelectItem>
          </SelectContent>
        </Select>
        {errors.country && (
          <p className="text-xs text-destructive">{errors.country.message}</p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="min-h-[44px] w-full"
      >
        {isSubmitting ? "Sauvegarde..." : "Sauvegarder"}
      </Button>
    </form>
  );
}
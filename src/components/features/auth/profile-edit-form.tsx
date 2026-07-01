"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  profileUpdateSchema,
  ALL_COUNTRIES,
  passwordChangeSchema,
  type ProfileUpdateInput,
  type PasswordChangeInput,
} from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/features/tags/tag-input";
import type { SelectedTag } from "@/lib/tags";
import { Separator } from "@/components/ui/separator";
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
    tags?: SelectedTag[];
    hasPassword?: boolean;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(profileUpdateSchema) as any,
    mode: "onBlur",
    defaultValues: {
      name: user.name,
      bio: user.bio ?? "",
      phone: user.phone ?? "",
      location: user.location ?? "",
      country: user.country ?? "",
      tags: user.tags ?? [],
    },
  });

  const countryValue = watch("country");
  const tagsValue = watch("tags") ?? [];

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
    <div className="space-y-6">
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
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        ) : null}
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
        {errors.bio ? (
          <p className="text-xs text-destructive">{errors.bio.message}</p>
        ) : null}
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
        {errors.phone ? (
          <p className="text-xs text-destructive">{errors.phone.message}</p>
        ) : null}
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
        {errors.location ? (
          <p className="text-xs text-destructive">{errors.location.message}</p>
        ) : null}
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

      <TagInput
        value={tagsValue}
        onChange={(tags) => setValue("tags", tags, { shouldDirty: true, shouldValidate: true })}
        description="Ajoute tes secteurs, montants recherchés et localisations préférées."
      />

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="min-h-[44px] w-full"
      >
        {isSubmitting ? "Sauvegarde..." : "Sauvegarder"}
      </Button>
    </form>

    <Separator className="my-6" />

    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Sécurité</h3>
        <p className="text-sm text-muted-foreground">
          Gère ton mot de passe et la sécurité de ton compte
        </p>
      </div>

      {user.hasPassword ? (
        <PasswordChangeForm />
      ) : (
        <div className="rounded-lg border border-muted bg-card p-5 flex items-start gap-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.273 0 3.19 2.764 1.255 6.79l3.995 2.975z"
              />
              <path
                fill="#34A853"
                d="M16.04 15.34c-1.045.727-2.382 1.173-4.04 1.173-2.927 0-5.418-1.982-6.309-4.655L1.627 14.8C3.627 18.864 7.782 21.6 12 21.6c3.155 0 6.027-1.127 8.09-3.082l-4.05-3.178z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.275c0-.8-.073-1.573-.2-2.318H12v4.51h6.473c-.282 1.482-1.11 2.74-2.382 3.59l4.05 3.18c2.373-2.19 3.736-5.418 3.736-8.962z"
              />
              <path
                fill="#FBBC05"
                d="M5.69 11.858c-.236-.727-.372-1.5-.372-2.3a7.12 7.12 0 0 1 .364-2.29l-3.995-2.975A11.95 11.95 0 0 0 0 12c0 2.873.973 5.518 2.618 7.627l3.073-2.769z"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Compte connecté via Google</p>
            <p className="text-xs text-muted-foreground">
              Votre compte est connecté via Google. Aucun mot de passe local n'est configuré pour ce compte.
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}

function getPasswordStrength(password: string): { label: string; color: string } {
  if (password.length === 0) return { label: "", color: "" };
  if (password.length < 8) return { label: "Faible", color: "text-red-500" };
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  if (password.length >= 12 && hasLetter && hasNumber && hasSymbol) {
    return { label: "Fort", color: "text-green-600" };
  }
  if (hasLetter && hasNumber) {
    return { label: "Moyen", color: "text-amber-500" };
  }
  return { label: "Faible", color: "text-red-500" };
}

function PasswordChangeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    mode: "onBlur",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const newPasswordValue = watch("newPassword", "");
  const strength = getPasswordStrength(newPasswordValue);

  const onSubmit = async (data: PasswordChangeInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status === 401) {
        window.location.href = "/auth/signin";
        return;
      }

      const payload = await res.json();

      if (!res.ok) {
        toast.error(payload.error || "Une erreur est survenue");
        return;
      }

      toast.success("Mot de passe mis à jour avec succès.");
      reset();
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
        <Input
          id="currentPassword"
          type="password"
          className="min-h-[44px]"
          {...register("currentPassword")}
        />
        {errors.currentPassword ? (
          <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
        <Input
          id="newPassword"
          type="password"
          className="min-h-[44px]"
          {...register("newPassword")}
        />
        {strength.label ? (
          <p className={`text-xs font-medium ${strength.color}`}>
            Force : {strength.label}
          </p>
        ) : null}
        {errors.newPassword ? (
          <p className="text-xs text-destructive">{errors.newPassword.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmNewPassword">Confirmation du nouveau mot de passe</Label>
        <Input
          id="confirmNewPassword"
          type="password"
          className="min-h-[44px]"
          {...register("confirmNewPassword")}
        />
        {errors.confirmNewPassword ? (
          <p className="text-xs text-destructive">{errors.confirmNewPassword.message}</p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="min-h-[44px] w-full mt-4"
      >
        {isSubmitting ? "Mise à jour..." : "Mettre à jour le mot de passe"}
      </Button>
    </form>
  );
}
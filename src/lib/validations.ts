import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export const signinSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  bio: z
    .string()
    .max(500, "La bio ne doit pas dépasser 500 caractères")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+?\d[\d\s.-]{6,}$/, "Veuillez saisir un numéro de téléphone valide.")
    .optional()
    .nullable()
    .or(z.literal("")),
  location: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .or(z.literal("")),
  country: z
    .string()
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const accountDeletionSchema = z.object({
  confirmation: z.literal("SUPPRIMER"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type AccountDeletionInput = z.infer<typeof accountDeletionSchema>;

export const subscriptionCreateSchema = z.object({
  tier: z.enum(["AFFRANCHI", "GRAND_FRERE", "BOSS"]),
  period: z.enum(["MONTHLY", "ANNUAL"]),
});

export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;

export const opportunityCreateSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères").max(200, "Le titre ne doit pas dépasser 200 caractères"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères").max(5000, "La description ne doit pas dépasser 5000 caractères"),
  category: z.enum(["INVESTISSEMENT", "BUSINESS", "PARTENARIAT", "IMMOBILIER"], {
    message: "Catégorie invalide",
  }),
  amount: z.number().positive("Le montant doit être positif").nullable().optional(),
});

export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>;

export const UEMOA_COUNTRIES = [
  { code: "CI", label: "Côte d'Ivoire" },
  { code: "SN", label: "Sénégal" },
  { code: "CM", label: "Cameroun" },
  { code: "GA", label: "Gabon" },
  { code: "BF", label: "Burkina Faso" },
  { code: "BI", label: "Burundi" },
  { code: "ML", label: "Mali" },
  { code: "NE", label: "Niger" },
  { code: "TG", label: "Togo" },
  { code: "GN", label: "Guinée" },
  { code: "BJ", label: "Bénin" },
] as const;
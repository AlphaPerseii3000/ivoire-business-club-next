import { z } from "zod";
import { TAG_CATEGORIES, isValidTagOption } from "@/lib/tags";

const tagSchema = z
  .object({
    category: z.enum(TAG_CATEGORIES),
    value: z.string().min(1, "Le tag est requis"),
  })
  .refine(isValidTagOption, "Tag invalide");

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
  tags: z.array(tagSchema).optional(),
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
  amount: z.preprocess(
    (v) => (typeof v === "number" && isNaN(v) ? null : v),
    z.number().positive("Le montant doit être positif").nullable().optional(),
  ),
  tags: z.array(tagSchema).optional(),
});

export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>;

export const opportunityAdminUpdateSchema = opportunityCreateSchema
  .pick({ title: true, description: true, category: true, amount: true })
  .extend({
    requiredTier: z.enum(["AFFRANCHI", "GRAND_FRERE", "BOSS"], {
      message: "Tier requis invalide",
    }).optional(),
  })
  .strict();

export type OpportunityAdminUpdateInput = z.infer<typeof opportunityAdminUpdateSchema>;

export const reviewCreateSchema = z.object({
  rating: z.number().int("La note doit être un nombre entier").min(1, "La note doit être comprise entre 1 et 5").max(5, "La note doit être comprise entre 1 et 5"),
  comment: z.string().trim().min(1, "Le commentaire est requis").max(500, "Le commentaire ne doit pas dépasser 500 caractères"),
});

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;

export const verificationStatusSchema = z.enum(["PENDING", "EN_COURS", "VERIFIED", "REJECTED"]);

export const opportunityAdminActionSchema = z
  .discriminatedUnion("action", [
    z.object({
      action: z.literal("move"),
      status: verificationStatusSchema,
      note: z.string().max(2000, "La note ne doit pas dépasser 2000 caractères").optional(),
    }),
    z.object({
      action: z.literal("verify"),
      note: z.string().max(2000, "La note ne doit pas dépasser 2000 caractères").optional(),
    }),
    z.object({
      action: z.literal("reject"),
      note: z.string().trim().min(1, "La note est obligatoire pour refuser un deal.").max(2000, "La note ne doit pas dépasser 2000 caractères"),
    }),
    z.object({
      action: z.literal("start_review"),
      note: z.string().max(2000, "La note ne doit pas dépasser 2000 caractères").optional(),
    }),
  ]);

export type OpportunityAdminActionInput = z.infer<typeof opportunityAdminActionSchema>;
export type VerificationStatusInput = z.infer<typeof verificationStatusSchema>;

export const DOCUMENT_ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const documentPresignSchema = z.object({
  fileName: z.string().min(1, "Le nom du fichier est requis").max(255, "Le nom du fichier est trop long"),
  mimeType: z.enum(DOCUMENT_ALLOWED_MIME_TYPES, {
    message: "Type de fichier non supporté. Utilisez PDF, JPEG, PNG ou WebP.",
  }),
  size: z.number().int().positive("La taille du fichier est invalide").max(DOCUMENT_MAX_SIZE_BYTES, "Le fichier dépasse la taille maximale de 10 Mo."),
});

export const documentCompleteSchema = documentPresignSchema.extend({
  r2Key: z.string().min(1, "La clé du document est requise"),
  fileName: z.string().min(1, "Le nom technique du fichier est requis").max(255),
  originalName: z.string().min(1, "Le nom du fichier est requis").max(255, "Le nom du fichier est trop long"),
});

export type DocumentPresignInput = z.infer<typeof documentPresignSchema>;
export type DocumentCompleteInput = z.infer<typeof documentCompleteSchema>;

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
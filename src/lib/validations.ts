import { z } from "zod";
import { TAG_CATEGORIES, isValidTagOption } from "@/lib/tags";
export enum ArticleVisibility {
  PUBLIC = "PUBLIC",
  AFFRANCHI = "AFFRANCHI",
  GRAND_FRERE = "GRAND_FRERE",
  BOSS = "BOSS",
}

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
  acceptTerms: z.literal(true, {
    message: "Vous devez accepter les conditions pour continuer.",
  }),
});

export const signinSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email("Email invalide"),
});

export const passwordResetSchema = z
  .object({
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string().min(1, "La confirmation du mot de passe est requise"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
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

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
    newPassword: z
      .string()
      .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères")
      .max(72, "Le nouveau mot de passe ne peut pas dépasser 72 caractères")
      .refine((val) => /[a-zA-Z]/.test(val) && /\d/.test(val), {
        message: "Le nouveau mot de passe doit contenir au moins une lettre et un chiffre",
      }),
    confirmNewPassword: z.string().min(1, "La confirmation du nouveau mot de passe est requise"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Les nouveaux mots de passe ne correspondent pas",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Le nouveau mot de passe doit être différent du mot de passe actuel",
    path: ["newPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ForgotPasswordRequestInput = z.infer<typeof forgotPasswordRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type AccountDeletionInput = z.infer<typeof accountDeletionSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

const MOBILE_MONEY_PREFIXES = [
  "+225", // Côte d'Ivoire
  "+221", // Sénégal
  "+226", // Burkina Faso
  "+223", // Mali
  "+229", // Bénin
  "+228", // Togo
  "+227", // Niger
  "+245", // Guinée-Bissau
  "+233", // Ghana
  "+224", // Guinée
  "+238", // Cap-Vert
];

const providerPhoneRegex = /^\+\d{7,15}$/;
const providerPhoneError =
  "Veuillez saisir un numéro mobile money international valide (ex. +225 01 23 45 67).";

function isSupportedMobileMoneyPrefix(phone: string | undefined | null) {
  if (!phone) return false;
  return MOBILE_MONEY_PREFIXES.some((prefix) => phone.startsWith(prefix));
}

export const subscriptionCreateSchema = z
  .object({
    tier: z.enum(["AFFRANCHI", "GRAND_FRERE", "BOSS"]),
    period: z.enum(["MONTHLY", "SEMESTERIAL", "ANNUAL"]),
    provider: z.enum(["BANK_TRANSFER", "WAVE", "ORANGE_MONEY"]).default("BANK_TRANSFER"),
    providerPhone: z.string().optional().nullable(),
  })
  .transform((data) => ({
    ...data,
    providerPhone: data.providerPhone === "" || data.providerPhone === undefined ? null : data.providerPhone,
  }))
  .refine(
    (data) => {
      if (data.provider === "BANK_TRANSFER") {
        return data.providerPhone === null;
      }
      return true;
    },
    {
      message: "Le numéro de téléphone mobile money n'est pas requis pour le virement bancaire.",
      path: ["providerPhone"],
    }
  )
  .refine(
    (data) => {
      if (data.provider !== "BANK_TRANSFER") {
        return data.providerPhone !== null;
      }
      return true;
    },
    {
      message: providerPhoneError,
      path: ["providerPhone"],
    }
  )
  .refine(
    (data) => {
      if (data.provider !== "BANK_TRANSFER" && data.providerPhone !== null) {
        return providerPhoneRegex.test(data.providerPhone) && isSupportedMobileMoneyPrefix(data.providerPhone);
      }
      return true;
    },
    {
      message: providerPhoneError,
      path: ["providerPhone"],
    }
  );

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
  currency: z.enum(["EUR", "XOF"], {
    message: "Devise invalide",
  }).default("EUR"),
  requiredTier: z.enum(["AFFRANCHI", "GRAND_FRERE", "BOSS"], {
    message: "Tier de visibilité invalide",
  }).default("AFFRANCHI"),
  tags: z.array(tagSchema).optional(),
});

export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>;

export const opportunityOwnerUpdateSchema = opportunityCreateSchema
  .pick({ title: true, description: true, category: true, amount: true, currency: true })
  .extend({
    requiredTier: z.enum(["AFFRANCHI", "GRAND_FRERE", "BOSS"], {
      message: "Tier de visibilité invalide",
    }).optional(),
  })
  .partial();

export type OpportunityOwnerUpdateInput = z.infer<typeof opportunityOwnerUpdateSchema>;

export const opportunityAdminUpdateSchema = opportunityCreateSchema
  .pick({ title: true, description: true, category: true, amount: true, currency: true })
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

export const ALL_COUNTRIES = [
  { code: "AF", label: "Afghanistan" },
  { code: "AL", label: "Albanie" },
  { code: "DZ", label: "Algérie" },
  { code: "AD", label: "Andorre" },
  { code: "AO", label: "Angola" },
  { code: "AG", label: "Antigua-et-Barbuda" },
  { code: "AR", label: "Argentine" },
  { code: "AM", label: "Arménie" },
  { code: "AU", label: "Australie" },
  { code: "AT", label: "Autriche" },
  { code: "AZ", label: "Azerbaïdjan" },
  { code: "BS", label: "Bahamas" },
  { code: "BH", label: "Bahreïn" },
  { code: "BD", label: "Bangladesh" },
  { code: "BB", label: "Barbade" },
  { code: "BY", label: "Biélorussie" },
  { code: "BE", label: "Belgique" },
  { code: "BZ", label: "Belize" },
  { code: "BJ", label: "Bénin" },
  { code: "BT", label: "Bhoutan" },
  { code: "BO", label: "Bolivie" },
  { code: "BA", label: "Bosnie-Herzégovine" },
  { code: "BW", label: "Botswana" },
  { code: "BR", label: "Brésil" },
  { code: "BN", label: "Brunei" },
  { code: "BG", label: "Bulgarie" },
  { code: "BF", label: "Burkina Faso" },
  { code: "BI", label: "Burundi" },
  { code: "CV", label: "Cap-Vert" },
  { code: "KH", label: "Cambodge" },
  { code: "CM", label: "Cameroun" },
  { code: "CA", label: "Canada" },
  { code: "CF", label: "République centrafricaine" },
  { code: "CL", label: "Chili" },
  { code: "CN", label: "Chine" },
  { code: "CY", label: "Chypre" },
  { code: "CO", label: "Colombie" },
  { code: "KM", label: "Comores" },
  { code: "CG", label: "Congo" },
  { code: "CD", label: "République démocratique du Congo" },
  { code: "KP", label: "Corée du Nord" },
  { code: "KR", label: "Corée du Sud" },
  { code: "CR", label: "Costa Rica" },
  { code: "CI", label: "Côte d'Ivoire" },
  { code: "HR", label: "Croatie" },
  { code: "CU", label: "Cuba" },
  { code: "DK", label: "Danemark" },
  { code: "DJ", label: "Djibouti" },
  { code: "DO", label: "République dominicaine" },
  { code: "DM", label: "Dominique" },
  { code: "EG", label: "Égypte" },
  { code: "SV", label: "Salvador" },
  { code: "AE", label: "Émirats arabes unis" },
  { code: "EC", label: "Équateur" },
  { code: "ER", label: "Érythrée" },
  { code: "ES", label: "Espagne" },
  { code: "EE", label: "Estonie" },
  { code: "SZ", label: "Eswatini" },
  { code: "US", label: "États-Unis" },
  { code: "ET", label: "Éthiopie" },
  { code: "FJ", label: "Fidji" },
  { code: "FI", label: "Finlande" },
  { code: "FR", label: "France" },
  { code: "GA", label: "Gabon" },
  { code: "GM", label: "Gambie" },
  { code: "GE", label: "Géorgie" },
  { code: "GH", label: "Ghana" },
  { code: "GR", label: "Grèce" },
  { code: "GD", label: "Grenade" },
  { code: "GT", label: "Guatemala" },
  { code: "GN", label: "Guinée" },
  { code: "GW", label: "Guinée-Bissau" },
  { code: "GQ", label: "Guinée équatoriale" },
  { code: "GY", label: "Guyana" },
  { code: "HT", label: "Haïti" },
  { code: "HN", label: "Honduras" },
  { code: "HU", label: "Hongrie" },
  { code: "IN", label: "Inde" },
  { code: "ID", label: "Indonésie" },
  { code: "IQ", label: "Irak" },
  { code: "IR", label: "Iran" },
  { code: "IE", label: "Irlande" },
  { code: "IS", label: "Islande" },
  { code: "IL", label: "Israël" },
  { code: "IT", label: "Italie" },
  { code: "JM", label: "Jamaïque" },
  { code: "JP", label: "Japon" },
  { code: "JO", label: "Jordanie" },
  { code: "KZ", label: "Kazakhstan" },
  { code: "KE", label: "Kenya" },
  { code: "KG", label: "Kirghizistan" },
  { code: "KI", label: "Kiribati" },
  { code: "KW", label: "Koweït" },
  { code: "LA", label: "Laos" },
  { code: "LS", label: "Lesotho" },
  { code: "LV", label: "Lettonie" },
  { code: "LB", label: "Liban" },
  { code: "LR", label: "Libéria" },
  { code: "LY", label: "Libye" },
  { code: "LI", label: "Liechtenstein" },
  { code: "LT", label: "Lituanie" },
  { code: "LU", label: "Luxembourg" },
  { code: "MK", label: "Macédoine du Nord" },
  { code: "MG", label: "Madagascar" },
  { code: "MY", label: "Malaisie" },
  { code: "MW", label: "Malawi" },
  { code: "MV", label: "Maldives" },
  { code: "ML", label: "Mali" },
  { code: "MT", label: "Malte" },
  { code: "MA", label: "Maroc" },
  { code: "MH", label: "Îles Marshall" },
  { code: "MU", label: "Maurice" },
  { code: "MR", label: "Mauritanie" },
  { code: "MX", label: "Mexique" },
  { code: "FM", label: "Micronésie" },
  { code: "MD", label: "Moldavie" },
  { code: "MC", label: "Monaco" },
  { code: "MN", label: "Mongolie" },
  { code: "ME", label: "Monténégro" },
  { code: "MZ", label: "Mozambique" },
  { code: "MM", label: "Myanmar" },
  { code: "NA", label: "Namibie" },
  { code: "NR", label: "Nauru" },
  { code: "NP", label: "Népal" },
  { code: "NI", label: "Nicaragua" },
  { code: "NE", label: "Niger" },
  { code: "NG", label: "Nigeria" },
  { code: "NU", label: "Niue" },
  { code: "NO", label: "Norvège" },
  { code: "NZ", label: "Nouvelle-Zélande" },
  { code: "OM", label: "Oman" },
  { code: "UG", label: "Ouganda" },
  { code: "UZ", label: "Ouzbékistan" },
  { code: "PK", label: "Pakistan" },
  { code: "PW", label: "Palaos" },
  { code: "PS", label: "Palestine" },
  { code: "PA", label: "Panama" },
  { code: "PG", label: "Papouasie-Nouvelle-Guinée" },
  { code: "PY", label: "Paraguay" },
  { code: "NL", label: "Pays-Bas" },
  { code: "PE", label: "Pérou" },
  { code: "PH", label: "Philippines" },
  { code: "PL", label: "Pologne" },
  { code: "PT", label: "Portugal" },
  { code: "QA", label: "Qatar" },
  { code: "RO", label: "Roumanie" },
  { code: "GB", label: "Royaume-Uni" },
  { code: "RU", label: "Russie" },
  { code: "RW", label: "Rwanda" },
  { code: "SB", label: "Îles Salomon" },
  { code: "SV", label: "Salvador" },
  { code: "WS", label: "Samoa" },
  { code: "SM", label: "Saint-Marin" },
  { code: "ST", label: "Sao Tomé-et-Príncipe" },
  { code: "SA", label: "Arabie saoudite" },
  { code: "SN", label: "Sénégal" },
  { code: "RS", label: "Serbie" },
  { code: "SC", label: "Seychelles" },
  { code: "SL", label: "Sierra Leone" },
  { code: "SG", label: "Singapour" },
  { code: "SK", label: "Slovaquie" },
  { code: "SI", label: "Slovénie" },
  { code: "SO", label: "Somalie" },
  { code: "SD", label: "Soudan" },
  { code: "SS", label: "Soudan du Sud" },
  { code: "LK", label: "Sri Lanka" },
  { code: "SE", label: "Suède" },
  { code: "CH", label: "Suisse" },
  { code: "SR", label: "Suriname" },
  { code: "SJ", label: "Svalbard et Jan Mayen" },
  { code: "SY", label: "Syrie" },
  { code: "TJ", label: "Tadjikistan" },
  { code: "TZ", label: "Tanzanie" },
  { code: "TD", label: "Tchad" },
  { code: "CZ", label: "Tchéquie" },
  { code: "TH", label: "Thaïlande" },
  { code: "TL", label: "Timor oriental" },
  { code: "TG", label: "Togo" },
  { code: "TK", label: "Tokelau" },
  { code: "TO", label: "Tonga" },
  { code: "TT", label: "Trinité-et-Tobago" },
  { code: "TN", label: "Tunisie" },
  { code: "TM", label: "Turkménistan" },
  { code: "TR", label: "Turquie" },
  { code: "TV", label: "Tuvalu" },
  { code: "UA", label: "Ukraine" },
  { code: "UY", label: "Uruguay" },
  { code: "VU", label: "Vanuatu" },
  { code: "VA", label: "Vatican" },
  { code: "VE", label: "Venezuela" },
  { code: "VN", label: "Viêt Nam" },
  { code: "YE", label: "Yémen" },
  { code: "ZM", label: "Zambie" },
  { code: "ZW", label: "Zimbabwe" },
] as const;

/** @deprecated Use ALL_COUNTRIES instead */
export const UEMOA_COUNTRIES = ALL_COUNTRIES;

export const articleCreateSchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères").max(200, "Le titre ne doit pas dépasser 200 caractères"),
  excerpt: z.string().trim().min(10, "Le résumé doit contenir au moins 10 caractères").max(500, "Le résumé ne doit pas dépasser 500 caractères"),
  content: z.string().trim().min(10, "Le contenu doit contenir au moins 10 caractères"),
  category: z.string().trim().min(1, "La catégorie est requise").max(50, "La catégorie ne doit pas dépasser 50 caractères"),
  visibility: z.nativeEnum(ArticleVisibility, {
    message: "Visibilité invalide",
  }),
  imageUrl: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || val.startsWith("/") || z.string().url().safeParse(val).success,
      { message: "L'URL de l'image doit être valide ou être un chemin relatif local (ex: /uploads/...)" }
    )
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  opportunityId: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
});

export const articleUpdateSchema = articleCreateSchema.partial().extend({
  published: z.boolean().optional(),
});

export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;

export const onboardingFormSchema = z.object({
  fullName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(150, "Le nom ne doit pas dépasser 150 caractères"),
  address: z.string().min(5, "L'adresse doit contenir au moins 5 caractères").max(300, "L'adresse ne doit pas dépasser 300 caractères"),
  phone: z.string().regex(/^\+?\d[\d\s.-]{6,}$/, "Veuillez saisir un numéro de téléphone valide."),
  country: z.string().min(2, "Sélectionne un pays"),
  email: z.string().email("Email invalide"),
  duration: z.enum(["MONTHLY", "SEMESTERIAL", "ANNUAL"], { message: "Durée d'adhésion invalide" }),
  tier: z.enum(["AFFRANCHI", "GRAND_FRERE", "BOSS"], { message: "Formule choisie invalide" }),
  activity: z.string().min(2, "L'activité doit contenir au moins 2 caractères").max(300, "L'activité ne doit pas dépasser 300 caractères"),
  goals: z.string().min(10, "Les objectifs doivent contenir au moins 10 caractères").max(2000, "Les objectifs ne doivent pas dépasser 2000 caractères"),
  needs: z.string().min(10, "Les besoins doivent contenir au moins 10 caractères").max(2000, "Les besoins ne doivent pas dépasser 2000 caractères"),
});

export type OnboardingFormInput = z.infer<typeof onboardingFormSchema>;

export const commentCreateSchema = z.object({
  content: z
    .string()
    .trim()
    .min(2, "Le commentaire doit contenir au moins 2 caractères")
    .max(1000, "Le commentaire ne doit pas dépasser 1000 caractères"),
});

export type CommentCreateInput = z.infer<typeof commentCreateSchema>;

export const leadMagnetSchema = z.object({
  email: z
    .string({ message: "L'email est requis" })
    .trim()
    .min(1, "L'email est requis")
    .email("Email invalide"),
});

export type LeadMagnetInput = z.infer<typeof leadMagnetSchema>;

export const eventImagePathSchema = z
  .string()
  .trim()
  .refine(
    (val) => val === "" || val.startsWith("/") || z.string().url().safeParse(val).success,
    { message: "Le chemin de couverture doit être une URL valide ou un chemin local" }
  )
  .transform((val) => (val === "" ? null : val))
  .optional()
  .nullable();

export const eventPricingSchema = z
  .object({
    visitor: z.number().int().nonnegative().nullable().optional(),
    affranchi: z.number().int().nonnegative().nullable().optional(),
    grand_frere: z.number().int().nonnegative().nullable().optional(),
    boss: z.number().int().nonnegative().nullable().optional(),
  })
  .optional()
  .nullable();

const baseEventSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  startDate: z.string().datetime("Date de début invalide"),
  endDate: z
    .string()
    .datetime("Date de fin invalide")
    .optional()
    .nullable()
    .or(z.literal("")),
  eventType: z.enum(["ONLINE", "IN_PERSON"]),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  location: z.string().trim().max(200).optional().nullable().or(z.literal("")),
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
  pricing: eventPricingSchema,
  coverImagePath: eventImagePathSchema,
});

export const eventCreateSchema = baseEventSchema
  .extend({
    eventType: z.enum(["ONLINE", "IN_PERSON"]).default("IN_PERSON"),
  })
  .refine(
    (data) => data.eventType !== "IN_PERSON" || (data.location && data.location.trim().length > 0),
    { message: "Le lieu est requis pour un événement en présentiel", path: ["location"] }
  )
  .refine(
    (data) => data.eventType !== "ONLINE" || (data.onlineUrl && data.onlineUrl.trim().length > 0),
    { message: "Le lien visio est requis pour un événement en ligne", path: ["onlineUrl"] }
  )
  .refine(
    (data) => !data.endDate || new Date(data.endDate).getTime() >= new Date(data.startDate).getTime(),
    { message: "La date de fin doit être postérieure ou égale à la date de début", path: ["endDate"] }
  );

export const eventUpdateSchema = baseEventSchema
  .partial()
  .extend({
    status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"], { message: "Statut invalide" }).optional(),
  })
  .superRefine((data, ctx) => {
    // Ne valider location/onlineUrl que si eventType est explicitement fourni
    if (data.eventType !== undefined) {
      if (data.eventType === "IN_PERSON" && (!data.location || data.location.trim() === "")) {
        ctx.addIssue({
          code: "custom",
          message: "Le lieu est requis pour un événement en présentiel",
          path: ["location"],
        });
      }
      if (data.eventType === "ONLINE" && (!data.onlineUrl || data.onlineUrl.trim() === "")) {
        ctx.addIssue({
          code: "custom",
          message: "Le lien de visioconférence est requis pour un événement en ligne",
          path: ["onlineUrl"],
        });
      }
    }
  })
  .refine(
    (data) => !data.endDate || !data.startDate || new Date(data.endDate).getTime() >= new Date(data.startDate).getTime(),
    { message: "La date de fin doit être postérieure ou égale à la date de début", path: ["endDate"] }
  );

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;

export const eventRegistrationSchema = z.object({
  email: z.string().trim().email("Adresse email invalide").optional().or(z.literal("")),
  payOnSite: z.boolean().default(false),
  provider: z.enum(["BANK_TRANSFER", "WAVE", "ORANGE_MONEY"]).optional().nullable(),
  providerPhone: z.string().trim().optional().nullable(),
});

export type EventRegistrationInput = z.infer<typeof eventRegistrationSchema>;

export const expertCreateSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères"),
  title: z.string().trim().min(2, "Le titre doit contenir au moins 2 caractères"),
  bio: z.string().trim().min(10, "La biographie doit contenir au moins 10 caractères"),
  photoUrl: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || val.startsWith("/") || z.string().url().safeParse(val).success,
      { message: "L'URL de la photo doit être valide ou être un chemin relatif local (ex: /uploads/...)" }
    )
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  phone: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  email: z
    .string()
    .trim()
    .refine((val) => val === "" || z.string().email().safeParse(val).success, {
      message: "Email invalide",
    })
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  whatsapp: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  specialties: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  requiredTier: z.enum(["AFFRANCHI", "GRAND_FRERE", "BOSS"], {
    message: "Tier de visibilité invalide",
  }).default("AFFRANCHI"),
  isPublished: z.boolean().optional().default(false),
});

export const expertUpdateSchema = expertCreateSchema.partial();

export type ExpertCreateInput = z.infer<typeof expertCreateSchema>;
export type ExpertUpdateInput = z.infer<typeof expertUpdateSchema>;

export const companyCreateSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères"),
  description: z.string().trim().min(10, "La description doit contenir au moins 10 caractères"),
  logoUrl: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || val.startsWith("/") || z.string().url().safeParse(val).success,
      { message: "L'URL du logo doit être valide ou être un chemin relatif local (ex: /uploads/...)" }
    )
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  contactName: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  contactPhone: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  contactEmail: z
    .string()
    .trim()
    .refine((val) => val === "" || z.string().email().safeParse(val).success, {
      message: "Email de contact invalide",
    })
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  website: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || z.string().url().safeParse(val).success,
      { message: "L'URL du site web doit être une URL absolue valide (ex: https://...)" }
    )
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  location: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  certifications: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  sectors: z
    .string()
    .trim()
    .transform((val) => (val === "" ? null : val))
    .optional()
    .nullable(),
  isPublished: z.boolean().optional().default(false),
});

export const companyUpdateSchema = companyCreateSchema.partial();

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;

const chatCategory = z.enum(["bug_technique", "accessibilite", "demande_integration", "autre"], {
  message: "Catégorie invalide",
});

export const chatMessageCreateSchema = z.object({
  category: chatCategory,
  content: z.string().trim().min(1, "Le message est requis").max(5000, "Le message ne doit pas dépasser 5000 caractères"),
});

export const chatAgentReplySchema = z.object({
  messageId: z.string().cuid({ message: "Identifiant de message invalide" }),
  content: z.string().trim().min(1, "La réponse est requise").max(1000, "La réponse ne doit pas dépasser 1000 caractères"),
});

export const chatAgentCloseSchema = z.object({
  messageId: z.string().cuid({ message: "Identifiant de message invalide" }),
});

export type ChatMessageCreateInput = z.infer<typeof chatMessageCreateSchema>;
export type ChatAgentReplyInput = z.infer<typeof chatAgentReplySchema>;
export type ChatAgentCloseInput = z.infer<typeof chatAgentCloseSchema>;


-- ConvertArticleVisibilityAndReactionTypeToEnums
-- This migration converts the text columns to proper PostgreSQL enums

-- Create enums (idempotent - will fail silently if already exists via DO block)
DO $$ BEGIN
    CREATE TYPE "ArticleVisibility" AS ENUM ('PUBLIC', 'AFFRANCHI', 'GRAND_FRERE', 'BOSS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'CLAP', 'INSIGHTFUL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop defaults before type conversion
ALTER TABLE "articles" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "article_reactions" ALTER COLUMN "type" DROP DEFAULT;

-- Convert columns from text to enum types
ALTER TABLE "articles" ALTER COLUMN "visibility" TYPE "ArticleVisibility" USING "visibility"::"ArticleVisibility";
ALTER TABLE "article_reactions" ALTER COLUMN "type" TYPE "ReactionType" USING "type"::"ReactionType";

-- Set proper enum defaults
ALTER TABLE "articles" ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';
ALTER TABLE "article_reactions" ALTER COLUMN "type" SET DEFAULT 'LIKE';
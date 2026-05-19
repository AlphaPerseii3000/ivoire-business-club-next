-- Align Prisma User.image field with the existing users.avatarUrl database column.
-- The Prisma schema keeps the application field name `image` and maps it to `avatarUrl`.
ALTER TABLE "users" RENAME COLUMN "image" TO "avatarUrl";

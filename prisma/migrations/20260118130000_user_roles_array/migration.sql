-- Convert single role to roles array

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "roles" "UserRole"[] NOT NULL DEFAULT ARRAY['READONLY']::"UserRole"[];

UPDATE "User"
SET "roles" = ARRAY["role"]::"UserRole"[]
WHERE "role" IS NOT NULL;

ALTER TABLE "User" DROP COLUMN IF EXISTS "role";

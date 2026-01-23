-- Add term applicability flags to grade scales

ALTER TABLE "MontessoriGradeScale"
  ADD COLUMN IF NOT EXISTS "appliesToMidyear" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "appliesToFinal" BOOLEAN NOT NULL DEFAULT true;

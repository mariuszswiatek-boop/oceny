-- Add grading term support and admin grading controls

DO $$ BEGIN
  CREATE TYPE "GradeTerm" AS ENUM ('MIDYEAR', 'FINAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "StudentGrade"
  ADD COLUMN IF NOT EXISTS "term" "GradeTerm" NOT NULL DEFAULT 'MIDYEAR';

DROP INDEX IF EXISTS "StudentGrade_studentId_subjectId_schoolYearId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "StudentGrade_studentId_subjectId_schoolYearId_term_key"
  ON "StudentGrade"("studentId", "subjectId", "schoolYearId", "term");
CREATE INDEX IF NOT EXISTS "StudentGrade_term_idx" ON "StudentGrade"("term");

ALTER TABLE "SchoolYear"
  ADD COLUMN IF NOT EXISTS "gradingTerm" "GradeTerm" NOT NULL DEFAULT 'MIDYEAR';
ALTER TABLE "SchoolYear"
  ADD COLUMN IF NOT EXISTS "isGradingOpen" BOOLEAN NOT NULL DEFAULT true;

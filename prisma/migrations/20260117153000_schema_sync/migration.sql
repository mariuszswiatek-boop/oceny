-- Align database schema with current Prisma models (post-initial migration)

-- Update UserRole enum to match current values
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'TEACHER', 'HOMEROOM', 'READONLY');

ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "User" SET "role" = 'TEACHER' WHERE "role" = 'NAUCZYCIEL';
UPDATE "User" SET "role" = 'HOMEROOM' WHERE "role" = 'WYCHOWAWCA';

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING ("role"::text::"UserRole_new");

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- SchoolYear updates
ALTER TABLE "SchoolYear" ALTER COLUMN "startDate" DROP NOT NULL;
ALTER TABLE "SchoolYear" ALTER COLUMN "endDate" DROP NOT NULL;
ALTER TABLE "SchoolYear" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Class updates
ALTER TABLE "Class" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Class" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Student updates
ALTER TABLE "Student" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- ParentContact updates
ALTER TABLE "ParentContact" ADD COLUMN "fullName" TEXT;
ALTER TABLE "ParentContact" ADD COLUMN "phone" TEXT;
ALTER TABLE "ParentContact" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- Subject updates
ALTER TABLE "Subject" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subject" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- TeacherAssignment updates
ALTER TABLE "TeacherAssignment" ADD COLUMN "schoolYearId" TEXT;
ALTER TABLE "TeacherAssignment" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "TeacherAssignment"
SET "schoolYearId" = (
  SELECT "id" FROM "SchoolYear"
  WHERE "isActive" = true
  ORDER BY "createdAt" DESC
  LIMIT 1
)
WHERE "schoolYearId" IS NULL;

ALTER TABLE "TeacherAssignment" ALTER COLUMN "schoolYearId" SET NOT NULL;

ALTER TABLE "TeacherAssignment"
  ADD CONSTRAINT "TeacherAssignment_schoolYearId_fkey"
  FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "TeacherAssignment_teacherId_subjectId_classId_key";
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_subjectId_classId_schoolYearId_key"
  ON "TeacherAssignment"("teacherId", "subjectId", "classId", "schoolYearId");
CREATE INDEX "TeacherAssignment_schoolYearId_idx" ON "TeacherAssignment"("schoolYearId");

-- MontessoriGradeScale updates
ALTER TABLE "MontessoriGradeScale" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
